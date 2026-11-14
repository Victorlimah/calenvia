/**
 * Opt-out do cliente (CAL-073). Quem responde SAIR (ou PARAR, STOP…) deixa de receber
 * mensagens automáticas; quem responde VOLTAR volta a receber.
 *
 * Escopo: se a resposta é a uma mensagem nossa (context.id), vale para o negócio que a enviou.
 * Sem contexto, vale para todos os negócios em que aquele número é cliente (o número que envia
 * é o mesmo da Calenvia para todos, então na dúvida paramos tudo).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMobile } from "@/lib/phone";
import type { Database } from "@/lib/supabase/types";

const OUT = new Set([
  "sair",
  "parar",
  "pare",
  "stop",
  "descadastrar",
  "nao quero receber",
  "nao quero mais receber",
  "nao enviar",
  "cancelar mensagens",
]);
const IN = new Set(["voltar", "ativar", "receber", "quero receber"]);

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A mensagem é um pedido de opt-out/opt-in? Só a mensagem inteira conta
 * ("sair" sim; "posso sair mais cedo?" não; "cancelar" sozinho também não — pode ser o horário).
 */
export function parseOptKeyword(text: string): "out" | "in" | null {
  const t = normalizeText(text);
  if (OUT.has(t)) return "out";
  if (IN.has(t)) return "in";
  return null;
}

export type IncomingMessage = {
  /** WhatsApp normalizado (55 + DDD + 9 dígitos). */
  from: string;
  text: string;
  contextId: string | null;
  at: Date;
};

type MetaIncoming = {
  from?: unknown;
  type?: unknown;
  timestamp?: unknown;
  text?: { body?: unknown };
  button?: { text?: unknown };
  interactive?: { button_reply?: { title?: unknown } };
  context?: { id?: unknown };
};

/** Mensagens de texto recebidas (entry[].changes[].value.messages[]). */
export function parseIncomingMessages(payload: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = (payload as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const messages = (change as { value?: { messages?: unknown } })?.value?.messages;
      if (!Array.isArray(messages)) continue;
      for (const m of messages as MetaIncoming[]) {
        // wa_id do Brasil às vezes vem sem o 9: normalizeMobile acrescenta.
        const from = typeof m.from === "string" ? normalizeMobile(m.from) : null;
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title;
        if (!from || typeof text !== "string") continue;
        const seconds = Number(m.timestamp);
        out.push({
          from,
          text,
          contextId: typeof m.context?.id === "string" ? m.context.id : null,
          at: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date(),
        });
      }
    }
  }
  return out;
}

export type OptOutSummary = { optedOut: number; optedIn: number };

/** Aplica SAIR/VOLTAR nos clientes (client service_role). */
export async function applyOptKeywords(
  db: SupabaseClient<Database>,
  messages: IncomingMessage[],
): Promise<OptOutSummary> {
  const summary: OptOutSummary = { optedOut: 0, optedIn: 0 };
  for (const m of messages) {
    const kind = parseOptKeyword(m.text);
    if (!kind) continue;
    let businessId: string | null = null;
    if (m.contextId) {
      const { data } = await db
        .from("messages")
        .select("business_id")
        .eq("provider_message_id", m.contextId)
        .maybeSingle();
      businessId = data?.business_id ?? null;
    }
    let q = db
      .from("customers")
      .update({ opted_out_at: kind === "out" ? m.at.toISOString() : null })
      .eq("whatsapp", m.from);
    if (businessId) q = q.eq("business_id", businessId);
    q = kind === "out" ? q.is("opted_out_at", null) : q.not("opted_out_at", "is", null);
    const { data, error } = await q.select("id");
    if (error) throw new Error(`Falha ao atualizar opt-out: ${error.message}`);
    if (kind === "out") summary.optedOut += data?.length ?? 0;
    else summary.optedIn += data?.length ?? 0;
  }
  return summary;
}
