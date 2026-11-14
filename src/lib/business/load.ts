import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { defaultWeekHours, type DayHours } from "@/lib/validation/business";
import type { ServiceRow } from "@/components/painel/services-editor";
import type { StaffRow } from "@/components/painel/staff-editor";

type Client = SupabaseClient<Database>;

export async function loadServices(supabase: Client, businessId: string): Promise<ServiceRow[]> {
  const { data } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_min, price_cents, is_active, is_featured, staff_services(staff_member_id)",
    )
    .eq("business_id", businessId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []).map(({ staff_services, ...s }) => ({
    ...s,
    staff_ids: staff_services.map((x) => x.staff_member_id),
  }));
}

export async function loadStaff(supabase: Client, businessId: string): Promise<StaffRow[]> {
  const { data } = await supabase
    .from("staff_members")
    .select("id, name, role, photo_url, is_active, staff_services(service_id), staff_hours(id)")
    .eq("business_id", businessId)
    .order("created_at");
  return (data ?? []).map(({ staff_services, staff_hours, ...s }) => ({
    ...s,
    service_ids: staff_services.map((x) => x.service_id),
    own_hours: staff_hours.length > 0,
  }));
}

/** Horário da semana; se nunca foi salvo, devolve o padrão sugerido. */
export async function loadWeekHours(
  supabase: Client,
  businessId: string,
): Promise<{ days: DayHours[]; saved: boolean }> {
  const [{ data: hours }, { data: breaks }] = await Promise.all([
    supabase.from("business_hours").select("*").eq("business_id", businessId),
    supabase.from("business_breaks").select("*").eq("business_id", businessId).order("starts_at"),
  ]);
  if (!hours?.length) return { days: defaultWeekHours(), saved: false };
  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    return {
      weekday,
      is_open: h?.is_open ?? false,
      opens_at: h?.opens_at?.slice(0, 5) ?? null,
      closes_at: h?.closes_at?.slice(0, 5) ?? null,
      breaks: (breaks ?? [])
        .filter((b) => b.weekday === weekday)
        .map((b) => ({ starts_at: b.starts_at.slice(0, 5), ends_at: b.ends_at.slice(0, 5) })),
    };
  });
  return { days, saved: true };
}
