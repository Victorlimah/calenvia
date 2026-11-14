/**
 * Política de remarcação e cancelamento pelo cliente (CAL-040 / CAL-052).
 * O dono define o prazo mínimo em Ajustes › Regras (businesses.cancel_notice_min).
 */
import { canManageByLink } from "@/lib/plans";

export type ManageBlockReason = "plan" | "canceled" | "past" | "done" | "deadline";

export type ManagePolicy =
  { ok: true; deadline: Date } | { ok: false; reason: ManageBlockReason; deadline: Date | null };

export function manageDeadline(start: Date, cancelNoticeMin: number): Date {
  return new Date(start.getTime() - Math.max(0, cancelNoticeMin) * 60_000);
}

/** O cliente pode remarcar/cancelar este agendamento pelo link agora? */
export function customerManagePolicy(
  business: { plan: string; plan_status: string; cancel_notice_min: number },
  appointment: { status: string; start: Date },
  now: Date = new Date(),
): ManagePolicy {
  const deadline = manageDeadline(appointment.start, business.cancel_notice_min);
  if (appointment.status === "canceled") return { ok: false, reason: "canceled", deadline: null };
  if (appointment.status !== "confirmed") return { ok: false, reason: "done", deadline: null };
  if (appointment.start <= now) return { ok: false, reason: "past", deadline: null };
  if (!canManageByLink(business)) return { ok: false, reason: "plan", deadline };
  if (now > deadline) return { ok: false, reason: "deadline", deadline };
  return { ok: true, deadline };
}
