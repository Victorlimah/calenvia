/**
 * Toda mensagem automática passa por aqui (CLAUDE.md §5). Decide pela ordem do CAL-111
 * (plano → ajustes do negócio → mensagens do agendamento → opt-out → cota), envia pelo
 * template aprovado, registra em `messages` e conta em `message_usage` (reservada antes do
 * envio e devolvida se falhar). Bloqueios ficam em `messages` como `skipped`, com o motivo,
 * sem contar na cota; o resultado traz o link wa.me com o texto pronto (plano B).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { periodOf } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";
import {
  cancellationText,
  confirmationText,
  reminderText,
  templateParams,
  type MessageVars,
} from "@/lib/messages/templates";
import { waMeLink } from "@/lib/phone";
import { canManageByLink, canSendAutomaticMessages, monthlyMessageLimit } from "@/lib/plans";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";
import type { Database } from "@/lib/supabase/types";
import {
  decideSend,
  DEFAULT_MESSAGE_SETTINGS,
  normalizeOffsets,
  type MessageSettings,
  type RecordedSkipReason,
} from "./message-settings";
import { WHATSAPP_TEMPLATES, type TemplateKind } from "./templates";
import type { Transport } from "./transport";

type Client = SupabaseClient<Database>;

export type SendBusiness = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  plan: string;
  plan_status: string;
  message_limit_override: number | null;
};

export type SendResult =
  | { status: "sent"; messageId: string }
  | {
      status: "skipped";
      reason: SkipReason;
      fallbackUrl: string | null;
    }
  | { status: "failed"; error: string; fallbackUrl: string };

/**
 * Motivos gravados em `messages` (RecordedSkipReason) e os que não geram registro:
 * canceled (lembrete/confirmação de cancelado), status (cancelamento de ativo),
 * not_found e duplicate (já existe registro para esse lembrete).
 */
export type SkipReason = RecordedSkipReason | "duplicate" | "canceled" | "status" | "not_found";

const TEXT: Record<TemplateKind, (v: MessageVars) => string> = {
  confirmation: confirmationText,
  reminder: reminderText,
  cancellation: cancellationText,
};

export async function loadMessageVars(db: Client, business: SendBusiness, appointmentId: string) {
  const { data: a } = await db
    .from("appointments")
    .select(
      "id, status, starts_at, customer_id, customer_name, customer_whatsapp, manage_code, messages_enabled, services(name), staff_members(name), customers(opted_out_at)",
    )
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!a) return null;
  const vars: MessageVars = {
    customerName: a.customer_name,
    businessName: business.name,
    serviceName: a.services?.name ?? "",
    staffName: a.staff_members?.name ?? "",
    start: new Date(a.starts_at),
    timezone: business.timezone,
    link: canManageByLink(business)
      ? businessUrl(business.slug, `/gerenciar/${a.manage_code}`)
      : businessUrl(business.slug, "/"),
  };
  return { appointment: a, vars, optedOut: Boolean(a.customers?.opted_out_at) };
}

/** Ajustes de mensagens do negócio (CAL-111); sem linha, valem os padrões. */
export async function loadMessageSettings(
  db: Client,
  businessId: string,
): Promise<MessageSettings> {
  const { data } = await db
    .from("business_message_settings")
    .select("confirmation_enabled, reminder_enabled, reminder_offsets_min, cancellation_enabled")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!data) return DEFAULT_MESSAGE_SETTINGS;
  return { ...data, reminder_offsets_min: normalizeOffsets(data.reminder_offsets_min) };
}

export async function monthUsage(db: Client, businessId: string, period: string): Promise<number> {
  const { data } = await db
    .from("message_usage")
    .select("count")
    .eq("business_id", businessId)
    .eq("period", period)
    .maybeSingle();
  return data?.count ?? 0;
}

export async function sendWhatsApp(
  deps: { db: Client; transport: Transport; now?: Date; settings?: MessageSettings },
  input: {
    business: SendBusiness;
    appointmentId: string;
    type: TemplateKind;
    /** Lembrete: antecedência em minutos (um registro por antecedência). */
    reminderOffsetMin?: number;
  },
): Promise<SendResult> {
  const { db, transport } = deps;
  const now = deps.now ?? new Date();
  const { business, type } = input;
  const loaded = await loadMessageVars(db, business, input.appointmentId);
  if (!loaded) return { status: "skipped", reason: "not_found", fallbackUrl: null };
  const { appointment, vars, optedOut } = loaded;
  const fallbackUrl = waMeLink(appointment.customer_whatsapp, TEXT[type](vars));
  const period = periodOf(now, business.timezone);
  const settings = deps.settings ?? (await loadMessageSettings(db, business.id));

  const baseRow = {
    business_id: business.id,
    appointment_id: appointment.id,
    type,
    to_number: appointment.customer_whatsapp,
    appointment_starts_at: appointment.starts_at,
    reminder_offset_min: type === "reminder" ? (input.reminderOffsetMin ?? null) : null,
    template: WHATSAPP_TEMPLATES[type].name,
  };

  /** Registra o bloqueio como skipped (não conta na cota). */
  const skip = async (reason: RecordedSkipReason): Promise<SendResult> => {
    const { error } = await db
      .from("messages")
      .insert({ ...baseRow, status: "skipped", skip_reason: reason });
    if (error && isPgError(error, PG_UNIQUE_VIOLATION))
      return { status: "skipped", reason: "duplicate", fallbackUrl };
    return { status: "skipped", reason, fallbackUrl };
  };

  const decision = decideSend({
    business,
    settings,
    type,
    appointmentStatus: appointment.status,
    messagesEnabled: appointment.messages_enabled,
    optedOut,
    usedThisMonth: canSendAutomaticMessages(business)
      ? await monthUsage(db, business.id, period)
      : 0,
  });
  if (decision.action === "ignore") {
    return { status: "skipped", reason: decision.reason, fallbackUrl: null };
  }
  if (decision.action === "skip") return skip(decision.reason);

  // Reserva atômica da cota (última barreira contra envios simultâneos).
  const { data: reserved, error: quotaError } = await db.rpc("consume_message_quota", {
    p_business_id: business.id,
    p_period: period,
    p_limit: monthlyMessageLimit(business),
  });
  if (quotaError) return { status: "failed", error: quotaError.message, fallbackUrl };
  if (reserved == null) return skip("no_quota");
  const release = () =>
    db.rpc("release_message_quota", { p_business_id: business.id, p_period: period });

  const { data: row, error: insertError } = await db
    .from("messages")
    .insert({ ...baseRow, status: "queued" })
    .select("id")
    .single();
  if (insertError || !row) {
    await release();
    if (isPgError(insertError, PG_UNIQUE_VIOLATION))
      return { status: "skipped", reason: "duplicate", fallbackUrl };
    return { status: "failed", error: insertError?.message ?? "insert", fallbackUrl };
  }

  try {
    const { providerMessageId } = await transport.sendTemplate({
      to: appointment.customer_whatsapp,
      kind: type,
      params: templateParams(type, vars),
    });
    await db
      .from("messages")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: now.toISOString(),
      })
      .eq("id", row.id);
    return { status: "sent", messageId: row.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db
      .from("messages")
      .update({ status: "failed", error: error.slice(0, 500) })
      .eq("id", row.id);
    await release();
    return { status: "failed", error, fallbackUrl };
  }
}
