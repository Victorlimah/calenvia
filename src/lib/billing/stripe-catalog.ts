import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cria no Stripe os produtos e preços que estão em `billing_prices` sem `provider_price_id`
 * (CAL-076 fase 6). Idempotente: produto com id fixo (`calenvia_plan_pro`,
 * `calenvia_addon_<code>`) e preço com `lookup_key = calenvia_<id do preço>`.
 *
 * Sem imports com "@/": também roda pelo script `npm run billing:sync`.
 */
const PLAN_NAMES: Record<string, string> = { basic: "Básico", pro: "Pro", pro_plus: "Pro+" };

export const productIdForPlan = (plan: string) => `calenvia_plan_${plan}`;
export const productIdForAddon = (code: string) => `calenvia_addon_${code}`;
export const CUSTOM_PRODUCT_ID = productIdForAddon("custom");

export async function ensureProduct(stripe: Stripe, id: string, name: string) {
  try {
    const p = await stripe.products.retrieve(id);
    if (!p.active) await stripe.products.update(id, { active: true });
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 404) throw e;
    await stripe.products.create({ id, name, metadata: { calenvia: "1" } });
  }
}

type PriceRow = {
  id: string;
  product: string;
  plan: string | null;
  amount_cents: number;
  billing_addons: { code: string; name: string } | null;
};

export async function syncCatalog(
  stripe: Stripe,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
): Promise<{ created: number }> {
  await ensureProduct(stripe, CUSTOM_PRODUCT_ID, "Combinado à parte");
  const { data, error } = await db
    .from("billing_prices")
    .select("id, product, plan, amount_cents, billing_addons(code, name)")
    .is("provider_price_id", null);
  if (error) throw new Error(`billing_prices: ${error.message}`);
  let created = 0;
  for (const row of (data ?? []) as unknown as PriceRow[]) {
    const productId =
      row.product === "plan"
        ? productIdForPlan(row.plan!)
        : productIdForAddon(row.billing_addons!.code);
    const name =
      row.product === "plan"
        ? `Calenvia ${PLAN_NAMES[row.plan!] ?? row.plan}`
        : row.billing_addons!.name;
    await ensureProduct(stripe, productId, name);
    const lookupKey = `calenvia_${row.id}`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const price =
      existing.data[0] ??
      (await stripe.prices.create({
        product: productId,
        currency: "brl",
        unit_amount: row.amount_cents,
        recurring: { interval: "month" },
        lookup_key: lookupKey,
        metadata: { calenvia_price_id: row.id },
      }));
    if (!existing.data[0]) created++;
    const { error: upd } = await db
      .from("billing_prices")
      .update({ provider_price_id: price.id })
      .eq("id", row.id);
    if (upd) throw new Error(`salvar provider_price_id: ${upd.message}`);
  }
  return { created };
}
