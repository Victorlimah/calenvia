/**
 * Lembretes automáticos (CAL-069). O Vercel Cron chama /api/cron/reminders a cada 10 minutos.
 *
 * Quando o lembrete sai:
 * - 24 h antes do horário;
 * - se o cliente agendou com menos de 24 h de antecedência, 2 h antes;
 * - se agendou com menos de 4 h, não há lembrete (a confirmação acabou de chegar).
 * Nunca para agendamentos cancelados, nunca dois para o mesmo horário (índice único no banco)
 * e nunca a menos de 30 min do horário (cron atrasado não manda lembrete inútil).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { plansWithAutomaticMessages, USABLE_PLAN_STATUSES } from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";
import { sendWhatsApp, type SendResult } from "./send";
import type { Transport } from "./transport";

const HOUR = 60 * 60 * 1000;
export const REMINDER_LEAD_MS = 24 * HOUR;
export const SHORT_REMINDER_LEAD_MS = 2 * HOUR;
/** Mínimo entre a confirmação (criação) e o lembrete curto. */
export const MIN_GAP_AFTER_BOOKING_MS = 2 * HOUR;
export const MIN_BEFORE_START_MS = 30 * 60 * 1000;
/** Tentativas que falharam (erro da Meta) antes de desistir daquele horário. */
export const MAX_FAILED_ATTEMPTS = 3;
export const BATCH_LIMIT = 200;

/** Momento em que o lembrete deve sair, ou null se esse agendamento não tem lembrete. */
export function reminderDueAt(start: Date, createdAt: Date): Date | null {
  const long = new Date(start.getTime() - REMINDER_LEAD_MS);
  if (createdAt <= long) return long;
  const short = new Date(start.getTime() - SHORT_REMINDER_LEAD_MS);
  if (short.getTime() - createdAt.getTime() >= MIN_GAP_AFTER_BOOKING_MS) return short;
  return null;
}

export type ReminderCandidate = {
  start: Date;
  createdAt: Date;
  /** Lembretes já registrados para este mesmo horário. */
  previous: { status: string }[];
};

/** O lembrete deve sair agora? */
export function isReminderDue(c: ReminderCandidate, now: Date): boolean {
  if (c.start.getTime() - now.getTime() < MIN_BEFORE_START_MS) return false;
  const due = reminderDueAt(c.start, c.createdAt);
  if (!due || due > now) return false;
  if (c.previous.some((m) => m.status !== "failed")) return false;
  return c.previous.filter((m) => m.status === "failed").length < MAX_FAILED_ATTEMPTS;
}

export type ReminderRunSummary = {
  checked: number;
  due: number;
  sent: number;
  skipped: Partial<Record<string, number>>;
  failed: number;
};

/** Procura os agendamentos com lembrete vencido e envia. Usa o client service_role. */
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
      "id, starts_at, created_at, businesses!inner(id, slug, name, timezone, plan, plan_status, message_limit_override), customers!inner(opted_out_at)",
    )
    .eq("status", "confirmed")
    .gt("starts_at", new Date(now.getTime() + MIN_BEFORE_START_MS).toISOString())
    .lte("starts_at", new Date(now.getTime() + REMINDER_LEAD_MS).toISOString())
    .in("businesses.plan", plansWithAutomaticMessages())
    .in("businesses.plan_status", USABLE_PLAN_STATUSES)
    .is("customers.opted_out_at", null)
    .order("starts_at")
    .limit(BATCH_LIMIT);
  if (error) throw new Error(`Falha ao buscar lembretes: ${error.message}`);
  if (!rows?.length) return summary;
  summary.checked = rows.length;

  const { data: previous, error: prevError } = await db
    .from("messages")
    .select("appointment_id, appointment_starts_at, status")
    .eq("type", "reminder")
    .in(
      "appointment_id",
      rows.map((r) => r.id),
    );
  if (prevError) throw new Error(`Falha ao buscar lembretes enviados: ${prevError.message}`);

  for (const row of rows) {
    const start = new Date(row.starts_at);
    const candidate: ReminderCandidate = {
      start,
      createdAt: new Date(row.created_at),
      previous: (previous ?? []).filter(
        (m) =>
          m.appointment_id === row.id &&
          m.appointment_starts_at !== null &&
          new Date(m.appointment_starts_at).getTime() === start.getTime(),
      ),
    };
    if (!isReminderDue(candidate, now)) continue;
    summary.due++;
    let result: SendResult;
    try {
      result = await sendWhatsApp(
        { db, transport, now },
        { business: row.businesses, appointmentId: row.id, type: "reminder" },
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
  return summary;
}
