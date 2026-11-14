/**
 * Webhook da Meta (CAL-070): verificação da URL, assinatura e status das mensagens
 * (enviada → entregue → lida, ou falhou). Funções puras + aplicação no banco.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TIMEZONE, periodOf } from "@/lib/dates";
import type { Database } from "@/lib/supabase/types";

export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

/** Verificação da URL (GET): devolve o challenge se o token bater, senão null. */
export function verifySubscription(
  params: URLSearchParams,
  verifyToken: string | undefined,
): string | null {
  if (!verifyToken) return null;
  if (params.get("hub.mode") !== "subscribe") return null;
  if (!safeEqual(params.get("hub.verify_token") ?? "", verifyToken)) return null;
  return params.get("hub.challenge");
}

/** Cabeçalho X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(corpo cru, app secret). */
export function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(header.slice(7), expected);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export type StatusUpdate = {
  providerMessageId: string;
  status: Exclude<MessageStatus, "queued">;
  at: Date;
  error: string | null;
};

type MetaStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
};

const KNOWN: StatusUpdate["status"][] = ["sent", "delivered", "read", "failed"];

/** Extrai os status do payload da Meta (entry[].changes[].value.statuses[]). Ignora o resto. */
export function parseStatusUpdates(payload: unknown): StatusUpdate[] {
  const out: StatusUpdate[] = [];
  const entries = (payload as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown } })?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const s of statuses as MetaStatus[]) {
        if (typeof s.id !== "string" || !KNOWN.includes(s.status as StatusUpdate["status"]))
          continue;
        const seconds = Number(s.timestamp);
        const err = s.errors?.[0];
        out.push({
          providerMessageId: s.id,
          status: s.status as StatusUpdate["status"],
          at: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date(),
          error: err
            ? [err.code, err.title ?? err.message, err.error_data?.details]
                .filter(Boolean)
                .join(" · ")
                .slice(0, 500)
            : null,
        });
      }
    }
  }
  return out;
}

const RANK: Record<MessageStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 1,
};

/**
 * Novo status depois de um evento, ou null se não muda. Os eventos podem chegar fora de ordem:
 * nunca volta (lida não vira entregue) e "falhou" só vale antes de entregue.
 */
export function nextStatus(
  current: string,
  incoming: StatusUpdate["status"],
): MessageStatus | null {
  const cur = current as MessageStatus;
  if (cur === incoming) return null;
  if (incoming === "failed") return cur === "queued" || cur === "sent" ? "failed" : null;
  if (cur === "failed") return null;
  return RANK[incoming] > RANK[cur] ? incoming : null;
}

export type ApplySummary = { received: number; updated: number; unknown: number };

/** Aplica os status no banco (client service_role). Falha depois de enviada devolve a cota. */
export async function applyStatusUpdates(
  db: SupabaseClient<Database>,
  updates: StatusUpdate[],
): Promise<ApplySummary> {
  const summary: ApplySummary = { received: updates.length, updated: 0, unknown: 0 };
  if (!updates.length) return summary;
  const ids = [...new Set(updates.map((u) => u.providerMessageId))];
  const { data: rows, error } = await db
    .from("messages")
    .select("id, business_id, status, provider_message_id, sent_at, businesses(timezone)")
    .in("provider_message_id", ids);
  if (error) throw new Error(`Falha ao buscar mensagens: ${error.message}`);
  const byProvider = new Map((rows ?? []).map((r) => [r.provider_message_id!, r]));

  // Mesma mensagem pode vir mais de uma vez no lote: aplica em ordem cronológica.
  for (const u of [...updates].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const row = byProvider.get(u.providerMessageId);
    if (!row) {
      summary.unknown++;
      continue;
    }
    const next = nextStatus(row.status, u.status);
    if (!next) continue;
    const patch: Database["public"]["Tables"]["messages"]["Update"] = { status: next };
    if (next === "failed") patch.error = u.error ?? "Falha informada pela Meta";
    const { error: upError } = await db
      .from("messages")
      .update(patch)
      .eq("id", row.id)
      .eq("status", row.status); // não sobrescreve se outro evento já mudou
    if (upError) throw new Error(`Falha ao atualizar mensagem: ${upError.message}`);
    if (next === "failed" && row.status === "sent" && row.sent_at) {
      // Só mensagens enviadas contam na cota: a que falhou na entrega é devolvida.
      await db.rpc("release_message_quota", {
        p_business_id: row.business_id,
        p_period: periodOf(new Date(row.sent_at), row.businesses?.timezone ?? DEFAULT_TIMEZONE),
      });
    }
    row.status = next;
    summary.updated++;
  }
  return summary;
}
