import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stripeClient } from "./stripe-client";
import { syncCatalog } from "./stripe-catalog";

/** Cria no Stripe os produtos/preços de `billing_prices` sem `provider_price_id`. */
export async function syncCatalogToStripe(): Promise<{ created: number }> {
  return syncCatalog(stripeClient(), createSupabaseAdminClient());
}
