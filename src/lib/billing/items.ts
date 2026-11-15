import "server-only";
import { PLANS, type PlanId } from "@/lib/plans";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { subscriptionTotal } from "./prices";
import type { InvoiceLine } from "./types";

type Db = ReturnType<typeof createSupabaseAdminClient>;

export type SubscriptionItem = InvoiceLine & {
  kind: "plan" | "addon" | "custom";
  /** business_addons.id (extras) */
  id: string | null;
  addonId: string | null;
  priceId: string | null;
  providerItemId: string | null;
  providerPriceId: string | null;
};

/**
 * O que a assinatura do negócio cobra por mês: plano (preço travado) + extras ativos.
 * `plan`/`priceId` permitem calcular com um plano diferente do atual (troca de plano).
 */
export async function loadSubscriptionItems(
  db: Db,
  businessId: string,
  override?: { plan: PlanId; priceId: string | null },
): Promise<{ items: SubscriptionItem[]; totalCents: number }> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, price_id, provider_item_id")
    .eq("business_id", businessId)
    .neq("status", "canceled")
    .maybeSingle();
  const plan = (override?.plan ?? sub?.plan ?? "basic") as PlanId;
  const priceId = override ? override.priceId : (sub?.price_id ?? null);

  let planAmount = PLANS[plan]?.priceCents ?? 0;
  let planProviderPrice: string | null = null;
  if (priceId) {
    const { data: price } = await db
      .from("billing_prices")
      .select("amount_cents, provider_price_id")
      .eq("id", priceId)
      .maybeSingle();
    if (price) {
      planAmount = price.amount_cents;
      planProviderPrice = price.provider_price_id;
    }
  }
  const items: SubscriptionItem[] = [
    {
      kind: "plan",
      id: null,
      addonId: null,
      priceId,
      providerItemId: sub?.provider_item_id ?? null,
      providerPriceId: planProviderPrice,
      description: `Plano ${PLANS[plan]?.name ?? plan}`,
      quantity: 1,
      amount_cents: planAmount,
    },
  ];

  const { data: addons } = await db
    .from("business_addons")
    .select(
      "id, addon_id, price_id, quantity, is_custom, custom_amount_cents, custom_label, provider_item_id, billing_addons!inner(name), billing_prices(amount_cents, provider_price_id)",
    )
    .eq("business_id", businessId)
    .is("removed_at", null)
    .order("created_at");
  for (const a of addons ?? []) {
    const price = a.billing_prices as {
      amount_cents: number;
      provider_price_id: string | null;
    } | null;
    items.push({
      kind: a.is_custom ? "custom" : "addon",
      id: a.id,
      addonId: a.addon_id,
      priceId: a.price_id,
      providerItemId: a.provider_item_id,
      providerPriceId: price?.provider_price_id ?? null,
      description: a.is_custom
        ? (a.custom_label ?? "Combinado")
        : (a.billing_addons as { name: string }).name,
      quantity: a.quantity,
      amount_cents: a.is_custom ? (a.custom_amount_cents ?? 0) : (price?.amount_cents ?? 0),
    });
  }
  const totalCents = subscriptionTotal(
    items.map((i) => ({ quantity: i.quantity, amountCents: i.amount_cents })),
  );
  return { items, totalCents };
}
