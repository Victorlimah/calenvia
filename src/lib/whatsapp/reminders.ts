/**
 * Lembretes automáticos (CAL-069 + CAL-111). O Vercel Cron chama /api/cron/reminders a cada
 * 10 minutos.
 *
 * - Um lembrete para cada antecedência configurada pelo negócio (24 h e/ou 2 h; padrão 2 h).
 * - Agendamento criado depois do horário de um lembrete pula aquele lembrete.
 * - Nunca dois para o mesmo agendamento, horário e antecedência (índice único em `messages`);
 *   remarcar gera lembretes novos para o novo horário.
 * - Mudar os ajustes vale para os próximos envios, inclusive de agendamentos já criados.
 * - Nunca a menos de 30 min do horário (cron atrasado não manda lembrete inútil).
 * Bloqueios (agendamento sem mensagens, opt-out, cota) ficam registrados como `skipped`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { plansWithAutomaticMessages, USABLE_PLAN_STATUSES } from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";
import {
  DEFAULT_MESSAGE_SETTINGS,
  normalizeOffsets,
  reminderSlots,
  type MessageSettings,
} from "./message-settings";
import { sendWhatsApp, type SendResult } from "./send";
import type { Transport } from "./transport";

export const MAX_OFFSET_MS = 24 * 60 * 60 * 1000;
export const MIN_BEFORE_START_MS = 30 * 60 * 1000;
/** Tentativas que falharam (erro da Meta) antes de desistir daquele lembrete. */
export const MAX_FAILED_ATTEMPTS = 3;
export const BATCH_LIMIT = 200;

export type PreviousReminder = { offsetMin: number | null; status: string };

/** O lembrete desta antecedência deve sair agora? (função pura) */
export function isReminderSlotDue(input: {
  start: Date;
  createdAt: Date;
  offsetMin: number;
  /** Registros de lembrete deste agendamento para este mesmo horário. */
  previous: PreviousReminder[];
  now: Date;
}): boolean {
  const { start, now } = input;
  if (start.getTime() - now.getTime() < MIN_BEFORE_START_MS) return false;
  const slot = reminderSlots(start, input.createdAt, [input.offsetMin])[0];
  if (!slot || slot.dueAt > now) return false;
  // Registros antigos (antes do CAL-111) não têm antecedência: valem para todas.
  const same = input.previous.filter(
    (p) => p.offsetMin === null || p.offsetMin === input.offsetMin,
  );
  if (same.some((p) => p.status !== "failed")) return false;
  return same.filter((p) => p.status === "failed").length < MAX_FAILED_ATTEMPTS;
}

/** Entre os lembretes cujo horário já chegou, o mais próximo do atendimento. */
export function latestDueSlot<T extends { offsetMin: number; dueAt: Date }>(
  slots: T[],
  now: Date,
): T | null {
  return slots.filter((s) => s.dueAt <= now).sort((a, b) => a.offsetMin - b.offsetMin)[0] ?? null;
}

export type ReminderRunSummary = {
  checked: number;
  due: number;
  sent: number;
  skipped: Partial<Record<string, number>>;
  failed: number;
};

/** Procura os lembretes vencidos e envia. Usa o client service_role. */
export async function runReminders(deps: {
  db: SupabaseClient<Database>;
  transport: Transport;
  now?: Date;
}): Promise<ReminderRunSummary> {
  const { db, transport } = deps;
  const now = deps.now ?? new Date();
  const summary: ReminderRunSummary = { checked: 0, due: 0, sent: 0, skipped: {}, failed: 0 };

  const { data: rows, error } = await db
    .from("appointments")
    .select(
      "id, business_id, starts_at, created_at, businesses!inner(id, slug, name, timezone, plan, plan_status, message_limit_override)",
    )
    .eq("status", "confirmed")
    .gt("starts_at", new Date(now.getTime() + MIN_BEFORE_START_MS).toISOString())
    .lte("starts_at", new Date(now.getTime() + MAX_OFFSET_MS).toISOString())
    .in("businesses.plan", plansWithAutomaticMessages())
    .in("businesses.plan_status", USABLE_PLAN_STATUSES)
    .order("starts_at")
    .limit(BATCH_LIMIT);
  if (error) throw new Error(`Falha ao buscar lembretes: ${error.message}`);
  if (!rows?.length) return summary;
  summary.checked = rows.length;

  const businessIds = [...new Set(rows.map((r) => r.business_id))];
  const [{ data: settingsRows, error: sError }, { data: previous, error: prevError }] =
    await Promise.all([
      db
        .from("business_message_settings")
        .select(
          "business_id, confirmation_enabled, reminder_enabled, reminder_offsets_min, cancellation_enabled",
        )
        .in("business_id", businessIds),
      db
        .from("messages")
        .select("appointment_id, appointment_starts_at, reminder_offset_min, status")
        .eq("type", "reminder")
        .in(
          "appointment_id",
          rows.map((r) => r.id),
        ),
    ]);
  if (sError) throw new Error(`Falha ao buscar ajustes: ${sError.message}`);
  if (prevError) throw new Error(`Falha ao buscar lembretes enviados: ${prevError.message}`);

  const settingsOf = new Map<string, MessageSettings>(
    (settingsRows ?? []).map(({ business_id, ...s }) => [
      business_id,
      { ...s, reminder_offsets_min: normalizeOffsets(s.reminder_offsets_min) },
    ]),
  );

  for (const row of rows) {
    const settings = settingsOf.get(row.business_id) ?? DEFAULT_MESSAGE_SETTINGS;
    if (!settings.reminder_enabled) continue; // lembrete desligado no negócio
    const start = new Date(row.starts_at);
    const createdAt = new Date(row.created_at);
    const prev = (previous ?? [])
      .filter(
        (m) =>
          m.appointment_id === row.id &&
          m.appointment_starts_at !== null &&
          new Date(m.appointment_starts_at).getTime() === start.getTime(),
      )
      .map((m) => ({ offsetMin: m.reminder_offset_min, status: m.status }));

    // Se mais de um lembrete venceu ao mesmo tempo (cron parado), só o mais próximo do
    // horário sai; o anterior perdeu o sentido e não é mais enviado.
    const due = reminderSlots(start, createdAt, settings.reminder_offsets_min).filter((slot) =>
      isReminderSlotDue({ start, createdAt, offsetMin: slot.offsetMin, previous: prev, now }),
    );
    const latest = latestDueSlot(
      reminderSlots(start, createdAt, settings.reminder_offsets_min),
      now,
    );
    for (const slot of due.filter((d) => d.offsetMin === latest?.offsetMin)) {
      summary.due++;
      let result: SendResult;
      try {
        result = await sendWhatsApp(
          { db, transport, now, settings },
          {
            business: row.businesses,
            appointmentId: row.id,
            type: "reminder",
            reminderOffsetMin: slot.offsetMin,
          },
        );
      } catch (e) {
        console.error("[lembretes] erro inesperado", row.id, e);
        summary.failed++;
        continue;
      }
      if (result.status === "sent") summary.sent++;
      else if (result.status === "failed") summary.failed++;
      else summary.skipped[result.reason] = (summary.skipped[result.reason] ?? 0) + 1;
    }
  }
  return summary;
}
