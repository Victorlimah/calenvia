import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvailabilityContext, WeekdayHours } from "@/lib/availability";
import type { Database, Tables } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
type BusinessRules = Pick<
  Tables<"businesses">,
  "id" | "timezone" | "slot_interval_min" | "min_notice_min" | "max_days_ahead"
>;

/**
 * Monta o contexto do motor de horários a partir do banco, para a janela [from, to).
 * Funciona com o client do dono (RLS) ou com a service role (fluxo público).
 */
export async function loadAvailabilityContext(
  db: Client,
  business: BusinessRules,
  window: { from: Date; to: Date },
  now: Date = new Date(),
): Promise<AvailabilityContext> {
  const [hours, breaks, staff, staffHours, appointments, blocks] = await Promise.all([
    db
      .from("business_hours")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("business_id", business.id),
    db.from("business_breaks").select("weekday, starts_at, ends_at").eq("business_id", business.id),
    db
      .from("staff_members")
      .select("id, name, staff_services(service_id)")
      .eq("business_id", business.id)
      .eq("is_active", true),
    db
      .from("staff_hours")
      .select("staff_member_id, weekday, is_open, opens_at, closes_at")
      .eq("business_id", business.id),
    db
      .from("appointments")
      .select("id, staff_member_id, starts_at, ends_at, status")
      .eq("business_id", business.id)
      .neq("status", "canceled")
      .lt("starts_at", window.to.toISOString())
      .gt("ends_at", window.from.toISOString()),
    db
      .from("time_blocks")
      .select("staff_member_id, starts_at, ends_at")
      .eq("business_id", business.id)
      .lt("starts_at", window.to.toISOString())
      .gt("ends_at", window.from.toISOString()),
  ]);

  const firstError = [hours, breaks, staff, staffHours, appointments, blocks].find(
    (r) => r.error,
  )?.error;
  if (firstError) throw firstError;

  const hoursByStaff = new Map<string, WeekdayHours[]>();
  for (const h of staffHours.data ?? []) {
    const list = hoursByStaff.get(h.staff_member_id) ?? [];
    list.push({
      weekday: h.weekday,
      is_open: h.is_open,
      opens_at: h.opens_at,
      closes_at: h.closes_at,
    });
    hoursByStaff.set(h.staff_member_id, list);
  }

  return {
    timezone: business.timezone,
    slotIntervalMin: business.slot_interval_min,
    minNoticeMin: business.min_notice_min,
    maxDaysAhead: business.max_days_ahead,
    businessHours: hours.data ?? [],
    breaks: breaks.data ?? [],
    staff: (staff.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      serviceIds: s.staff_services.map((x) => x.service_id),
      hours: hoursByStaff.get(s.id),
    })),
    appointments: (appointments.data ?? []).map((a) => ({
      id: a.id,
      staffId: a.staff_member_id,
      start: new Date(a.starts_at),
      end: new Date(a.ends_at),
      status: a.status as "confirmed",
    })),
    blocks: (blocks.data ?? []).map((b) => ({
      staffId: b.staff_member_id,
      start: new Date(b.starts_at),
      end: new Date(b.ends_at),
    })),
    now,
  };
}
