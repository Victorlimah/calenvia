import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";

/** Preço atual de um plano (do banco; `priceId` null = fallback de plans.ts). */
export type PlanPrice = { plan: PlanId; priceId: string | null; amountCents: number };

export type AddonKind = "messages" | "members" | "custom";

/** Extra do catálogo com o preço atual. */
export type AddonPrice = {
  addonId: string;
  priceId: string;
  code: string;
  name: string;
  description: string;
  kind: AddonKind;
  unitAmount: number | null;
  plans: PlanId[];
  sortOrder: number;
  amountCents: number;
};

export type CurrentPrices = { plans: Record<PlanId, PlanPrice>; addons: AddonPrice[] };

/** Linha vinda de `current_prices()`. */
export type CurrentPriceRow = {
  price_id: string;
  product: string;
  plan: string | null;
  addon_id: string | null;
  addon_code: string | null;
  addon_name: string | null;
  addon_description: string | null;
  addon_kind: string | null;
  addon_unit_amount: number | null;
  addon_plans: string[] | null;
  addon_sort_order: number | null;
  amount_cents: number;
};

/** Preços de plans.ts, usados se o banco não responder. */
export function fallbackPrices(): CurrentPrices {
  const plans = Object.fromEntries(
    PLAN_ORDER.map((id) => [id, { plan: id, priceId: null, amountCents: PLANS[id].priceCents }]),
  ) as Record<PlanId, PlanPrice>;
  return { plans, addons: [] };
}

export function pricesFromRows(rows: CurrentPriceRow[]): CurrentPrices {
  const out = fallbackPrices();
  for (const r of rows) {
    if (r.product === "plan" && r.plan && r.plan in PLANS) {
      out.plans[r.plan as PlanId] = {
        plan: r.plan as PlanId,
        priceId: r.price_id,
        amountCents: r.amount_cents,
      };
    } else if (r.product === "addon" && r.addon_id && r.addon_code) {
      out.addons.push({
        addonId: r.addon_id,
        priceId: r.price_id,
        code: r.addon_code,
        name: r.addon_name ?? r.addon_code,
        description: r.addon_description ?? "",
        kind: (r.addon_kind as AddonKind) ?? "custom",
        unitAmount: r.addon_unit_amount,
        plans: (r.addon_plans ?? []).filter((p): p is PlanId => p in PLANS),
        sortOrder: r.addon_sort_order ?? 0,
        amountCents: r.amount_cents,
      });
    }
  }
  out.addons.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return out;
}

/** Extras do catálogo que um plano aceita (ex.: pessoa extra não aparece no Pro+). */
export function addonsForPlan(addons: AddonPrice[], plan: PlanId): AddonPrice[] {
  return addons.filter((a) => a.plans.includes(plan));
}

export type PricedItem = { description: string; quantity: number; amountCents: number };

/** Total do mês (soma de valor unitário × quantidade). */
export function subscriptionTotal(items: Pick<PricedItem, "quantity" | "amountCents">[]): number {
  return items.reduce((sum, i) => sum + Math.max(0, i.quantity) * Math.max(0, i.amountCents), 0);
}

export type AddonChoice = { addonId: string; quantity: number };

/**
 * Itens de um checkout a partir do plano e dos extras escolhidos, já filtrando extras que o
 * plano não aceita, quantidade 0 e extras fora do catálogo.
 */
export function checkoutItems(
  prices: CurrentPrices,
  plan: PlanId,
  choices: AddonChoice[],
): {
  planPrice: PlanPrice;
  addons: { addon: AddonPrice; quantity: number }[];
  lines: PricedItem[];
  totalCents: number;
} {
  const planPrice = prices.plans[plan];
  const allowed = addonsForPlan(prices.addons, plan);
  const addons: { addon: AddonPrice; quantity: number }[] = [];
  for (const choice of choices) {
    const addon = allowed.find((a) => a.addonId === choice.addonId);
    const quantity = Math.floor(choice.quantity);
    if (!addon || !(quantity > 0)) continue;
    const existing = addons.find((a) => a.addon.addonId === addon.addonId);
    if (existing) existing.quantity += quantity;
    else addons.push({ addon, quantity });
  }
  const lines: PricedItem[] = [
    { description: `Plano ${PLANS[plan].name}`, quantity: 1, amountCents: planPrice.amountCents },
    ...addons.map((a) => ({
      description: a.addon.name,
      quantity: a.quantity,
      amountCents: a.addon.amountCents,
    })),
  ];
  return { planPrice, addons, lines, totalCents: subscriptionTotal(lines) };
}
