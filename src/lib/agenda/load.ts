import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAvailabilityContext } from "@/lib/booking";
import { zonedDayRange, type LocalDate } from "@/lib/dates";
import type { Business } from "@/lib/business/current";
import type { Database } from "@/lib/supabase/types";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import type { AgendaAppointment, AgendaBlock } from "./timeline";
import { wasDelivered } from "@/lib/whatsapp/message-settings";

type Client = SupabaseClient<Database>;

export async function loadAppointments(
  db: Client,
  businessId: string,
  range: { from: Date; to: Date },
  /** Busca os valores (só volta algo para quem tem finance.view, CAL-112). */
  options: { withPrices?: boolean } = {},
): Promise<AgendaAppointment[]> {
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, source, customer_name, customer_whatsapp, staff_member_id, services(name), staff_members(name), messages(type, status)",
    )
    .eq("business_id", businessId)
    .lt("starts_at", range.to.toISOString())
    .gt("ends_at", range.from.toISOString())
    .order("starts_at");
  if (error) throw error;
  const prices = options.withPrices
    ? await loadAppointmentPrices(
        db,
        businessId,
        (data ?? []).map((a) => a.id),
      )
    : new Map<string, number>();
  return (data ?? []).map((a) => ({
    id: a.id,
    start: new Date(a.starts_at),
    end: new Date(a.ends_at),
    status: a.status as AgendaAppointment["status"],
    source: a.source as AgendaAppointment["source"],
    customerName: a.customer_name,
    customerWhatsapp: a.customer_whatsapp,
    serviceName: a.services?.name ?? "Serviço",
    staffId: a.staff_member_id,
    staffName: a.staff_members?.name ?? "",
    priceCents: prices.get(a.id) ?? null,
    confirmationSent: (a.messages ?? []).some((m) => m.type === "confirmation" && wasDelivered(m)),
  }));
}

export async function loadBlocks(
  db: Client,
  businessId: string,
  range: { from: Date; to: Date },
): Promise<AgendaBlock[]> {
  const { data } = await db
    .from("time_blocks")
    .select("id, starts_at, ends_at, staff_member_id, reason")
    .eq("business_id", businessId)
    .lt("starts_at", range.to.toISOString())
    .gt("ends_at", range.from.toISOString())
    .order("starts_at");
  return (data ?? []).map((b) => ({
    id: b.id,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    staffId: b.staff_member_id,
    reason: b.reason,
  }));
}

export async function loadAgendaDay(
  db: Client,
  business: Business,
  date: LocalDate,
  options: { withPrices?: boolean } = {},
) {
  const { start, end } = zonedDayRange(date, business.timezone);
  const range = { from: start, to: end };
  const [ctx, appointments, blocks] = await Promise.all([
    loadAvailabilityContext(db, business, range),
    loadAppointments(db, business.id, range, options),
    loadBlocks(db, business.id, range),
  ]);
  return { ctx, appointments, blocks };
}
