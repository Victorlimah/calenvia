import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Hours = {
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

/** Horários do negócio, intervalos e profissionais ativos (com horário próprio), para a ocupação. */
export async function loadCapacity(db: SupabaseClient<Database>, businessId: string) {
  const [hours, breaks, staff, staffHours] = await Promise.all([
    db
      .from("business_hours")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("business_id", businessId),
    db.from("business_breaks").select("weekday, starts_at, ends_at").eq("business_id", businessId),
    db.from("staff_members").select("id, name").eq("business_id", businessId).eq("is_active", true),
    db
      .from("staff_hours")
      .select("staff_member_id, weekday, is_open, opens_at, closes_at")
      .eq("business_id", businessId),
  ]);
  const own = new Map<string, Hours[]>();
  for (const h of staffHours.data ?? []) {
    own.set(h.staff_member_id, [...(own.get(h.staff_member_id) ?? []), h]);
  }
  return {
    business: { hours: (hours.data ?? []) as Hours[], breaks: breaks.data ?? [] },
    staff: (staff.data ?? []).map((s) => ({ id: s.id, name: s.name, hours: own.get(s.id) })),
  };
}
