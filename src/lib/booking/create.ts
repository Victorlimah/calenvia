import { APPOINTMENT_COLUMNS } from "@/lib/appointments/columns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSlotAvailable, pickStaffForSlot } from "@/lib/availability";
import { toLocalDate, zonedDayRange } from "@/lib/dates";
import type { Database, Tables } from "@/lib/supabase/types";
import { loadAvailabilityContext } from "./context";
import { upsertCustomer } from "./customers";
import { BookingError, toBookingError } from "./errors";

type Client = SupabaseClient<Database>;

export type CreateAppointmentInput = {
  business: Pick<
    Tables<"businesses">,
    "id" | "timezone" | "slot_interval_min" | "min_notice_min" | "max_days_ahead"
  >;
  serviceId: string;
  /** null = "Sem preferência" */
  staffId: string | null;
  start: Date;
  customer: { name: string; whatsapp: string };
  source: "link" | "manual";
  notes?: string | null;
  /** Agendamento manual: o dono pode marcar sem respeitar a antecedência mínima. */
  ignoreNotice?: boolean;
  now?: Date;
};

/** Agendamento sem o valor (só `finance.view` lê `price_cents`, CAL-112). */
export type CreatedAppointment = Omit<Tables<"appointments">, "price_cents">;

/**
 * Cria um agendamento revalidando tudo no servidor (CLAUDE.md §5, regra 9).
 * A constraint EXCLUDE do banco é a última barreira contra conflito.
 */
export async function createAppointment(
  db: Client,
  input: CreateAppointmentInput,
): Promise<CreatedAppointment> {
  try {
    const { business } = input;
    const { data: service } = await db
      .from("services")
      .select("id, duration_min, price_cents, is_active")
      .eq("id", input.serviceId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!service || !service.is_active) throw new BookingError("invalid_service");

    const date = toLocalDate(input.start, business.timezone);
    const day = zonedDayRange(date, business.timezone);
    const ctx = await loadAvailabilityContext(
      db,
      business,
      { from: day.start, to: day.end },
      input.now,
    );
    if (input.ignoreNotice) ctx.minNoticeMin = -24 * 60 * 365;

    if (
      input.staffId &&
      !ctx.staff.some((s) => s.id === input.staffId && s.serviceIds.includes(service.id))
    ) {
      throw new BookingError("invalid_staff");
    }

    const check = isSlotAvailable(ctx, {
      date,
      serviceId: service.id,
      durationMin: service.duration_min,
      staffId: input.staffId,
      start: input.start,
    });
    if (!check.ok) throw new BookingError("unavailable");

    const staffId = input.staffId ?? pickStaffForSlot(ctx, check.staffIds, date);
    if (!staffId) throw new BookingError("unavailable");

    const customer = await upsertCustomer(db, business.id, input.customer);
    const end = new Date(input.start.getTime() + service.duration_min * 60_000);

    const { data, error } = await db
      .from("appointments")
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        service_id: service.id,
        staff_member_id: staffId,
        starts_at: input.start.toISOString(),
        ends_at: end.toISOString(),
        status: "confirmed",
        source: input.source,
        notes: input.notes ?? null,
        price_cents: service.price_cents,
        customer_name: customer.name,
        customer_whatsapp: customer.whatsapp,
      })
      .select(APPOINTMENT_COLUMNS)
      .single();
    if (error || !data) throw error ?? new BookingError("unknown");
    return data;
  } catch (error) {
    const e = toBookingError(error);
    if (e.code === "unknown") console.error("createAppointment", error);
    throw e;
  }
}
