import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMobile } from "@/lib/phone";
import type { Database } from "@/lib/supabase/types";
import { BookingError } from "./errors";

type Client = SupabaseClient<Database>;

export function cleanCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

/**
 * Cadastro automático do cliente final (CAL-051): busca por negócio + WhatsApp normalizado.
 * Se existir, atualiza o nome para o mais recente; se não, cria. Atômico (upsert).
 */
export async function upsertCustomer(
  db: Client,
  businessId: string,
  input: { name: string; whatsapp: string },
): Promise<{ id: string; name: string; whatsapp: string; opted_out_at: string | null }> {
  const whatsapp = normalizeMobile(input.whatsapp);
  const name = cleanCustomerName(input.name);
  if (!whatsapp || name.length < 2) throw new BookingError("invalid_customer");
  const { data, error } = await db
    .from("customers")
    .upsert({ business_id: businessId, whatsapp, name }, { onConflict: "business_id,whatsapp" })
    .select("id, name, whatsapp, opted_out_at")
    .single();
  if (error || !data) throw error ?? new BookingError("unknown");
  return data;
}
