import { APPOINTMENT_COLUMNS } from "@/lib/appointments/columns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDaySlots, isSlotAvailable, pickStaffForSlot, type DaySlots } from "@/lib/availability";
import { toLocalDate, zonedDayRange, type LocalDate } from "@/lib/dates";
import type { Database, Tables } from "@/lib/supabase/types";
import { loadAvailabilityContext } from "./context";
import { BookingError, toBookingError } from "./errors";

type Client = SupabaseClient<Database>;
type BusinessRules = Pick<
  Tables<"businesses">,
  "id" | "timezone" | "slot_interval_min" | "min_notice_min" | "max_days_ahead"
>;

async function loadAppointment(db: Client, businessId: string, appointmentId: string) {
  const { data } = await db
    .from("appointments")
    .select("id, status, service_id, staff_member_id, starts_at, ends_at, services(duration_min)")
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .maybeSingle();
  return data;
}

/** Horários livres para remarcar um agendamento (ignora o próprio horário dele). */
export async function rescheduleSlots(
  db: Client,
  business: BusinessRules,
  input: {
    appointmentId: string;
    date: LocalDate;
    staffId: string | null;
    ignoreNotice?: boolean;
    now?: Date;
  },
): Promise<DaySlots> {
  const appt = await loadAppointment(db, business.id, input.appointmentId);
  if (!appt) throw new BookingError("unavailable");
  const day = zonedDayRange(input.date, business.timezone);
  const ctx = await loadAvailabilityContext(
    db,
    business,
    { from: day.start, to: day.end },
    input.now,
  );
  if (input.ignoreNotice) {
    ctx.minNoticeMin = 0;
    ctx.maxDaysAhead = 3650;
  }
  return getDaySlots(ctx, {
    date: input.date,
    serviceId: appt.service_id,
    durationMin:
      appt.services?.duration_min ??
      Math.round((Date.parse(appt.ends_at) - Date.parse(appt.starts_at)) / 60000),
    staffId: input.staffId,
    excludeAppointmentId: appt.id,
  });
}

/** Remarca revalidando no servidor; a constraint do banco segue como última barreira. */
export async function rescheduleAppointment(
  db: Client,
  business: BusinessRules,
  input: {
    appointmentId: string;
    start: Date;
    staffId: string | null;
    ignoreNotice?: boolean;
    now?: Date;
  },
): Promise<Omit<Tables<"appointments">, "price_cents">> {
  try {
    const appt = await loadAppointment(db, business.id, input.appointmentId);
    if (!appt || appt.status === "canceled") throw new BookingError("unavailable");
    const durationMin =
      appt.services?.duration_min ??
      Math.round((Date.parse(appt.ends_at) - Date.parse(appt.starts_at)) / 60000);
    const date = toLocalDate(input.start, business.timezone);
    const day = zonedDayRange(date, business.timezone);
    const ctx = await loadAvailabilityContext(
      db,
      business,
      { from: day.start, to: day.end },
      input.now,
    );
    if (input.ignoreNotice) {
      ctx.minNoticeMin = 0;
      ctx.maxDaysAhead = 3650;
    }
    const check = isSlotAvailable(ctx, {
      date,
      serviceId: appt.service_id,
      durationMin,
      staffId: input.staffId,
      start: input.start,
      excludeAppointmentId: appt.id,
    });
    if (!check.ok) throw new BookingError("unavailable");
    const staffId =
      input.staffId ??
      (check.staffIds.includes(appt.staff_member_id)
        ? appt.staff_member_id
        : pickStaffForSlot(ctx, check.staffIds, date));
    if (!staffId) throw new BookingError("unavailable");
    const { data, error } = await db
      .from("appointments")
      .update({
        starts_at: input.start.toISOString(),
        ends_at: new Date(input.start.getTime() + durationMin * 60_000).toISOString(),
        staff_member_id: staffId,
        status: "confirmed",
      })
      .eq("id", appt.id)
      .eq("business_id", business.id)
      .select(APPOINTMENT_COLUMNS)
      .single();
    if (error || !data) throw error ?? new BookingError("unknown");
    return data;
  } catch (e) {
    throw toBookingError(e);
  }
}
