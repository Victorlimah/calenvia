import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fallbackPrices, pricesFromRows, type CurrentPrices } from "./prices";

const TTL_MS = 60_000;
let cached: { at: number; value: CurrentPrices } | null = null;

/**
 * Preço atual de cada plano e extra (banco, `current_prices()`), com cache curto.
 * Se o banco não responder, usa os preços de plans.ts (sem extras).
 * `fresh: true` ignora o cache (checkout e admin).
 */
export async function getCurrentPrices(opts: { fresh?: boolean } = {}): Promise<CurrentPrices> {
  if (!opts.fresh && cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const { data, error } = await createSupabaseAdminClient().rpc("current_prices");
    if (error || !data) throw new Error(error?.message ?? "sem dados");
    const value = pricesFromRows(data);
    cached = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.warn("[billing] preços do banco indisponíveis, usando plans.ts:", e);
    return cached?.value ?? fallbackPrices();
  }
}

/** Esquece o cache (depois de mudar um preço no /admin). */
export function invalidatePricesCache() {
  cached = null;
}
