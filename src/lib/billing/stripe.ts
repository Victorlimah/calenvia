import "server-only";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/plans";
import { TRIAL_DAYS } from "./config";
import type { SubscriptionRow } from "./events";
import { loadSubscriptionItems } from "./items";
import { WebhookRejected, type BillingProvider } from "./provider";
import { CUSTOM_PRODUCT_ID } from "./stripe-catalog";
import { stripeClient } from "./stripe-client";
import {
  mapStripeEvent,
  META,
  splitItems,
  subscriptionPeriod,
  type PriceLookup,
} from "./stripe-map";
import { syncCatalogToStripe } from "./stripe-sync";

/**
 * Provedor Stripe (CAL-076 fase 6). Checkout hospedado (`mode: subscription`), plano + extras
 * como itens da assinatura, cobrança proporcional nas mudanças, cancelamento no fim do período,
 * Customer Portal para o cartão e webhook validado com `BILLING_WEBHOOK_SECRET`.
 * Passo a passo da conta: docs/STRIPE.md.
 */

type Db = ReturnType<typeof createSupabaseAdminClient>;

async function priceLookup(db: Db): Promise<PriceLookup> {
  const { data } = await db
    .from("billing_prices")
    .select("id, plan, addon_id, provider_price_id")
    .not("provider_price_id", "is", null);
  return new Map(
    (data ?? []).map((p) => [
      p.provider_price_id!,
      { priceId: p.id, plan: (p.plan as PlanId | null) ?? null, addonId: p.addon_id },
    ]),
  );
}

/** provider_price_id dos preços pedidos; cria no Stripe o que faltar. */
async function providerPrices(db: Db, priceIds: string[]): Promise<Map<string, string>> {
  const load = async () => {
    const { data } = await db
      .from("billing_prices")
      .select("id, provider_price_id")
      .in("id", priceIds);
    return new Map(
      (data ?? []).filter((p) => p.provider_price_id).map((p) => [p.id, p.provider_price_id!]),
    );
  };
  let map = await load();
  if (priceIds.some((id) => !map.has(id))) {
    await syncCatalogToStripe();
    map = await load();
  }
  const missing = priceIds.filter((id) => !map.has(id));
  if (missing.length) throw new Error(`Preço sem correspondente no Stripe: ${missing.join(", ")}`);
  return map;
}

async function retrieve(sub: SubscriptionRow): Promise<Stripe.Subscription> {
  if (!sub.provider_subscription_id) throw new Error("Assinatura sem id no Stripe.");
  return stripeClient().subscriptions.retrieve(sub.provider_subscription_id);
}

/**
 * Deixa os itens da assinatura no Stripe iguais ao que a Calenvia cobra (plano + extras +
 * combinados). Itens casados por metadata `calenvia_item` (plano ou business_addons.id) e, na
 * falta, pelo `provider_item_id` salvo ou pelo preço.
 */
async function syncItems(sub: SubscriptionRow, prorate: boolean) {
  const db = createSupabaseAdminClient();
  const stripe = stripeClient();
  const remote = await retrieve(sub);
  const { items } = await loadSubscriptionItems(db, sub.business_id);
  const priceMap = await providerPrices(
    db,
    items.filter((i) => i.kind !== "custom" && i.priceId).map((i) => i.priceId!),
  );

  const used = new Set<string>();
  const findRemote = (key: string, providerItemId: string | null, providerPrice: string | null) =>
    remote.items.data.find(
      (r) =>
        !used.has(r.id) &&
        (r.metadata?.[META.item] === key ||
          (providerItemId && r.id === providerItemId) ||
          (providerPrice && r.price.id === providerPrice)),
    );

  const params: Stripe.SubscriptionUpdateParams.Item[] = [];
  const saved: { key: string; remoteId?: string }[] = [];
  for (const item of items) {
    const key = item.kind === "plan" ? "plan" : item.id!;
    const providerPrice = item.priceId ? (priceMap.get(item.priceId) ?? null) : null;
    const match = findRemote(
      key,
      item.providerItemId,
      item.kind === "custom" ? null : providerPrice,
    );
    if (match) used.add(match.id);
    const pricing: Pick<Stripe.SubscriptionUpdateParams.Item, "price" | "price_data"> =
      item.kind === "custom"
        ? {
            price_data: {
              currency: "brl",
              product: CUSTOM_PRODUCT_ID,
              unit_amount: item.amount_cents,
              recurring: { interval: "month" },
            },
          }
        : { price: providerPrice! };
    params.push({
      ...(match ? { id: match.id } : {}),
      ...pricing,
      quantity: item.quantity,
      metadata: { [META.item]: key },
    });
    saved.push({ key, remoteId: match?.id });
  }
  for (const r of remote.items.data) if (!used.has(r.id)) params.push({ id: r.id, deleted: true });

  const updated = await stripe.subscriptions.update(remote.id, {
    items: params,
    proration_behavior: prorate ? "create_prorations" : "none",
  });

  // Guarda o id de cada item no Stripe.
  for (const r of updated.items.data) {
    const key = r.metadata?.[META.item];
    if (key === "plan") {
      await db.from("subscriptions").update({ provider_item_id: r.id }).eq("id", sub.id);
    } else if (key) {
      await db.from("business_addons").update({ provider_item_id: r.id }).eq("id", key);
    }
  }
}

export const stripeProvider: BillingProvider = {
  id: "stripe",

  async createCheckout(input) {
    const db = createSupabaseAdminClient();
    const stripe = stripeClient();
    const priceMap = await providerPrices(db, [
      input.items.priceId,
      ...input.items.addons.map((a) => a.priceId),
    ]);
    // Reaproveita o cliente do Stripe de uma assinatura anterior do negócio.
    const { data: previous } = await db
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("business_id", input.businessId)
      .eq("provider", "stripe")
      .not("provider_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const metadata = {
      [META.businessId]: input.businessId,
      [META.checkoutSessionId]: input.checkoutSessionId,
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "pt-BR",
      currency: "brl",
      payment_method_types: ["card"],
      line_items: [
        { price: priceMap.get(input.items.priceId)!, quantity: 1 },
        ...input.items.addons.map((a) => ({
          price: priceMap.get(a.priceId)!,
          quantity: a.quantity,
        })),
      ],
      ...(previous?.provider_customer_id
        ? { customer: previous.provider_customer_id }
        : input.customerEmail
          ? { customer_email: input.customerEmail }
          : {}),
      client_reference_id: input.businessId,
      metadata,
      subscription_data: {
        metadata,
        ...(TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) throw new Error("Stripe não devolveu a URL do checkout.");
    return { url: session.url, providerSessionId: session.id };
  },

  async syncItems(sub, opts) {
    await syncItems(sub, opts?.prorate ?? true);
  },

  async changePlan(sub, target, when) {
    const db = createSupabaseAdminClient();
    const stripe = stripeClient();
    const remote = await retrieve(sub);
    const lookup = await priceLookup(db);
    const { planItem } = splitItems(remote, lookup);
    if (!planItem) throw new Error("Item do plano não encontrado no Stripe.");

    if (when === "at_renewal") {
      // O preço já foi trocado quando o downgrade foi agendado; só limpa o agendamento.
      await stripe.subscriptions.update(remote.id, {
        metadata: { [META.pendingPlan]: "", [META.pendingFrom]: "" },
      });
      return;
    }
    const providerPrice = (await providerPrices(db, [target.priceId])).get(target.priceId)!;
    if (when === "now") {
      // Upgrade: troca na hora e cobra a diferença já (fatura proporcional imediata). Extras
      // que o plano novo não aceita saem junto (na Calenvia, pelo webhook subscription.updated).
      const { data: addons } = await db
        .from("business_addons")
        .select("provider_item_id, billing_addons!inner(plans)")
        .eq("business_id", sub.business_id)
        .eq("is_custom", false)
        .is("removed_at", null)
        .not("provider_item_id", "is", null);
      const drop = (addons ?? [])
        .filter((a) => !(a.billing_addons as { plans: string[] }).plans.includes(target.plan))
        .map((a) => ({ id: a.provider_item_id!, deleted: true }));
      await stripe.subscriptions.update(remote.id, {
        items: [
          { id: planItem.id, price: providerPrice, metadata: { [META.item]: "plan" } },
          ...drop,
        ],
        proration_behavior: "always_invoice",
        metadata: { [META.pendingPlan]: "", [META.pendingFrom]: "" },
      });
      return;
    }
    // Downgrade no fim do ciclo: o preço novo vale a partir da próxima fatura (sem
    // proporcional); a metadata diz à Calenvia que o plano só muda quando o ciclo virar.
    const same = target.plan === sub.plan;
    const { end } = subscriptionPeriod(remote);
    await stripe.subscriptions.update(remote.id, {
      items: [{ id: planItem.id, price: providerPrice, metadata: { [META.item]: "plan" } }],
      proration_behavior: "none",
      metadata: same
        ? { [META.pendingPlan]: "", [META.pendingFrom]: "" }
        : { [META.pendingPlan]: target.plan, [META.pendingFrom]: end ?? "" },
    });
  },

  async cancel(sub) {
    await stripeClient().subscriptions.update(sub.provider_subscription_id!, {
      cancel_at_period_end: true,
    });
  },

  async resume(sub) {
    await stripeClient().subscriptions.update(sub.provider_subscription_id!, {
      cancel_at_period_end: false,
    });
  },

  async customerPortalUrl(sub, returnUrl) {
    if (!sub.provider_customer_id) return null;
    const session = await stripeClient().billingPortal.sessions.create({
      customer: sub.provider_customer_id,
      return_url: returnUrl,
      locale: "pt-BR",
      ...(process.env.STRIPE_PORTAL_CONFIGURATION_ID
        ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID }
        : {}),
    });
    return session.url;
  },

  async parseWebhook(request) {
    const secret = process.env.BILLING_WEBHOOK_SECRET;
    if (!secret) throw new WebhookRejected("BILLING_WEBHOOK_SECRET não configurado.");
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new WebhookRejected("Assinatura do webhook ausente.");
    const body = await request.text();
    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret);
    } catch {
      throw new WebhookRejected("Assinatura do webhook inválida.");
    }
    const db = createSupabaseAdminClient();
    const lookup = await priceLookup(db);
    let subscription: Stripe.Subscription | null = null;
    if (event.type === "checkout.session.completed") {
      const s = event.data.object.subscription;
      if (s) subscription = await stripe.subscriptions.retrieve(typeof s === "string" ? s : s.id);
    }
    return mapStripeEvent(event, lookup, subscription);
  },
};
