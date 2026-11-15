/**
 * Ajustes de mensagens automáticas (CAL-111): o que o negócio envia, quando sai o lembrete
 * e a regra de decisão de cada envio. Funções puras (sem banco).
 */
import { canSendAutomaticMessages, quotaState } from "@/lib/plans";
import type { TemplateKind } from "./templates";

export const REMINDER_OFFSET_OPTIONS = [
  { min: 1440, label: "24 horas antes" },
  { min: 120, label: "2 horas antes" },
] as const;

export type ReminderOffset = (typeof REMINDER_OFFSET_OPTIONS)[number]["min"];

export type MessageSettings = {
  confirmation_enabled: boolean;
  reminder_enabled: boolean;
  reminder_offsets_min: number[];
  cancellation_enabled: boolean;
};

export const DEFAULT_MESSAGE_SETTINGS: MessageSettings = {
  confirmation_enabled: true,
  reminder_enabled: true,
  reminder_offsets_min: [120],
  cancellation_enabled: true,
};

/** Motivos gravados em messages.skip_reason (não contam na cota). */
export type RecordedSkipReason =
  "plan_basic" | "disabled_by_business" | "disabled_for_appointment" | "opted_out" | "no_quota";

export const SKIP_REASON_LABELS: Record<RecordedSkipReason, string> = {
  plan_basic: "plano sem envio automático",
  disabled_by_business: "desligada nos ajustes",
  disabled_for_appointment: "desligada neste agendamento",
  opted_out: "cliente pediu para não receber",
  no_quota: "cota do mês acabou",
};

export function isTypeEnabled(s: MessageSettings, type: TemplateKind): boolean {
  if (type === "confirmation") return s.confirmation_enabled;
  if (type === "cancellation") return s.cancellation_enabled;
  return s.reminder_enabled && s.reminder_offsets_min.length > 0;
}

export type SendDecision =
  | { action: "send" }
  /** Bloqueado: grava em messages como skipped, com o motivo. */
  | { action: "skip"; reason: RecordedSkipReason }
  /** Não se aplica (nada é gravado): lembrete/confirmação de cancelado, ou cancelamento de ativo. */
  | { action: "ignore"; reason: "canceled" | "status" };

/**
 * Decide o envio de uma mensagem automática. Ordem (CAL-111):
 * plano → configuração do negócio → mensagens do agendamento → opt-out → cota.
 */
export function decideSend(input: {
  business: {
    plan: string;
    plan_status: string;
    message_limit_override?: number | null;
    addon_messages?: number | null;
  };
  settings: MessageSettings;
  type: TemplateKind;
  appointmentStatus: string;
  messagesEnabled: boolean;
  optedOut: boolean;
  usedThisMonth: number;
}): SendDecision {
  if (input.type !== "cancellation" && input.appointmentStatus === "canceled")
    return { action: "ignore", reason: "canceled" };
  if (input.type === "cancellation" && input.appointmentStatus !== "canceled")
    return { action: "ignore", reason: "status" };
  if (!canSendAutomaticMessages(input.business)) return { action: "skip", reason: "plan_basic" };
  if (!isTypeEnabled(input.settings, input.type))
    return { action: "skip", reason: "disabled_by_business" };
  if (!input.messagesEnabled) return { action: "skip", reason: "disabled_for_appointment" };
  if (input.optedOut) return { action: "skip", reason: "opted_out" };
  if (quotaState(input.business, input.usedThisMonth).exhausted)
    return { action: "skip", reason: "no_quota" };
  return { action: "send" };
}

/** Mensagens que cada agendamento gasta (confirmação + lembretes; cancelamento é eventual). */
export function messagesPerAppointment(s: MessageSettings): number {
  return (
    (s.confirmation_enabled ? 1 : 0) + (s.reminder_enabled ? s.reminder_offsets_min.length : 0)
  );
}

/** Quantos agendamentos por mês a cota atende com essa configuração (null = não gasta cota). */
export function appointmentsPerQuota(limit: number, s: MessageSettings): number | null {
  const per = messagesPerAppointment(s);
  return per === 0 ? null : Math.floor(limit / per);
}

/** Normaliza o que vem do banco/formulário (só 1440 e 120, sem repetir, maior primeiro). */
export function normalizeOffsets(raw: unknown): number[] {
  const list = Array.isArray(raw) ? raw.map(Number) : [];
  const allowed = REMINDER_OFFSET_OPTIONS.map((o) => o.min as number);
  return [...new Set(list.filter((n) => allowed.includes(n)))].sort((a, b) => b - a);
}

export type ReminderSlot = { offsetMin: number; dueAt: Date };

/**
 * Lembretes de um agendamento: um por antecedência configurada. Se o agendamento foi criado
 * depois do horário de um lembrete, aquele lembrete é pulado (ex.: agendou com 1 h de
 * antecedência → não sai nem o de 24 h nem o de 2 h).
 */
export function reminderSlots(start: Date, createdAt: Date, offsetsMin: number[]): ReminderSlot[] {
  return normalizeOffsets(offsetsMin)
    .map((offsetMin) => ({ offsetMin, dueAt: new Date(start.getTime() - offsetMin * 60_000) }))
    .filter((slot) => createdAt <= slot.dueAt);
}

/** A mensagem chegou a sair (automática ou enviada pelo dono no wa.me)? skipped/failed não contam. */
export function wasDelivered(m: { status: string }): boolean {
  return !["failed", "skipped"].includes(m.status);
}
