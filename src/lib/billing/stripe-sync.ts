import "server-only";

/** Cria no Stripe os produtos/preços de `billing_prices` sem `provider_price_id` (fase 6). */
export async function syncCatalogToStripe(): Promise<{ created: number }> {
  throw new Error("Stripe ainda não configurado (CAL-076 fase 6).");
}
