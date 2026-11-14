import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Valores dos agendamentos (CAL-112). Só volta algo para quem tem `finance.view`; para os
 * outros papéis o mapa vem vazio (a função no banco checa a permissão).
 */
export async function loadAppointmentPrices(
  db: SupabaseClient<Database>,
  businessId: string,
  ids: string[],
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data } = await db.rpc("appointment_prices", { p_business_id: businessId, p_ids: ids });
  return new Map((data ?? []).map((r) => [r.id, r.price_cents]));
}
