import type Stripe from "stripe";
import type { PlanId } from "@/lib/plans";
import type { BillingEvent, InvoiceLine, NormalizedInvoice } from "./types";

/**
 * Converte objetos do Stripe em eventos normalizados (CAL-076 fase 6). Funções puras: quem
 * chama (stripe.ts) busca no banco o que for preciso e passa em `prices`.
 * API do Stripe: 2025-08-27.basil (período fica nos itens; assinatura da fatura em `parent`).
 */

/** provider_price_id → o que é na Calenvia. */
export type PriceLookup = Map<
  string,
  { priceId: string; plan: PlanId | null; addonId: string | null }
>;

export const META = {
  businessId: "calenvia_business_id",
  checkoutSessionId: "calenvia_checkout_session_id",
  item: "calenvia_item",
  pendingPlan: "calenvia_pending_plan",
  pendingFrom: "calenvia_pending_from",
} as const;

const iso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null;

const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === "string" ? v : (v?.id ?? null);

export function subscriptionPeriod(sub: Stripe.Subscription): {
  start: string | null;
  end: string | null;
} {
  const item = sub.items?.data?.[0];
  return { start: iso(item?.current_period_start), end: iso(item?.current_period_end) };
}

/** Item do plano e itens dos extras (por addon_id), casando o preço do Stripe com o banco. */
export function splitItems(
  sub: Stripe.Subscription,
  prices: PriceLookup,
): {
  planItem: Stripe.SubscriptionItem | null;
  plan: PlanId | null;
  priceId: string | null;
  addonItems: Record<string, string>;
} {
  let planItem: Stripe.SubscriptionItem | null = null;
  let plan: PlanId | null = null;
  let priceId: string | null = null;
  const addonItems: Record<string, string> = {};
  for (const item of sub.items?.data ?? []) {
    const known = prices.get(item.price.id);
    if (item.metadata?.[META.item] === "plan" || known?.plan) {
      planItem = item;
      plan = known?.plan ?? plan;
      priceId = known?.priceId ?? priceId;
    } else if (known?.addonId) {
      addonItems[known.addonId] = item.id;
    }
  }
  return { planItem, plan, priceId, addonItems };
}

export function normalizeInvoice(invoice: Stripe.Invoice): NormalizedInvoice {
  const lines: InvoiceLine[] = (invoice.lines?.data ?? []).map((l) => ({
    description: l.description ?? "Item",
    quantity: l.quantity ?? 1,
    amount_cents: l.quantity ? Math.round(l.amount / l.quantity) : l.amount,
  }));
  const first = invoice.lines?.data?.find((l) => l.period)?.period;
  return {
    providerInvoiceId: invoice.id!,
    amountCents: invoice.status === "paid" ? invoice.amount_paid : invoice.amount_due,
    periodStart: iso(first?.start),
    periodEnd: iso(first?.end),
    hostedUrl: invoice.hosted_invoice_url ?? null,
    lines,
  };
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return idOf(invoice.parent?.subscription_details?.subscription ?? null);
}

/** Assinatura atualizada → evento normalizado (plano, troca agendada, cancelamento, período). */
export function mapSubscriptionUpdated(
  eventId: string,
  sub: Stripe.Subscription,
  prices: PriceLookup,
  now: Date = new Date(),
): BillingEvent {
  const { plan, priceId } = splitItems(sub, prices);
  const period = subscriptionPeriod(sub);
  const pendingFrom = sub.metadata?.[META.pendingFrom];
  // Downgrade agendado: o preço novo já está no Stripe (vale na próxima fatura), mas o plano só
  // muda na Calenvia quando o ciclo virar.
  const pending =
    !!sub.metadata?.[META.pendingPlan] && !!pendingFrom && now < new Date(pendingFrom);
  return {
    id: eventId,
    provider: "stripe",
    occurredAt: now.toISOString(),
    businessId: sub.metadata?.[META.businessId] ?? null,
    type: "subscription.updated",
    providerSubscriptionId: sub.id,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    periodStart: period.start,
    periodEnd: period.end,
    ...(plan
      ? pending
        ? { pendingPlan: plan, pendingPriceId: priceId }
        : { plan, priceId, pendingPlan: null, pendingPriceId: null }
      : {}),
  };
}

/**
 * Evento do webhook → eventos normalizados. `subscription` só é preciso no
 * `checkout.session.completed` (o chamador busca no Stripe).
 */
export function mapStripeEvent(
  event: Stripe.Event,
  prices: PriceLookup,
  subscription: Stripe.Subscription | null = null,
): BillingEvent[] {
  const occurredAt = iso(event.created) ?? new Date().toISOString();
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription" || !subscription) return [];
      const checkoutSessionId = session.metadata?.[META.checkoutSessionId];
      if (!checkoutSessionId) return [];
      const { planItem, addonItems } = splitItems(subscription, prices);
      const period = subscriptionPeriod(subscription);
      return [
        {
          id: event.id,
          provider: "stripe",
          occurredAt,
          businessId: session.metadata?.[META.businessId] ?? null,
          type: "checkout.completed",
          checkoutSessionId,
          providerSubscriptionId: subscription.id,
          providerCustomerId: idOf(session.customer),
          providerItemId: planItem?.id ?? null,
          addonItems,
          periodStart: period.start ?? occurredAt,
          periodEnd: period.end ?? occurredAt,
          trialEnd: iso(subscription.trial_end),
        },
      ];
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subId = invoiceSubscriptionId(invoice);
      if (!subId) return [];
      return [
        {
          id: event.id,
          provider: "stripe",
          occurredAt,
          businessId: invoice.parent?.subscription_details?.metadata?.[META.businessId] ?? null,
          type: event.type === "invoice.paid" ? "invoice.paid" : "invoice.payment_failed",
          providerSubscriptionId: subId,
          invoice: normalizeInvoice(invoice),
        },
      ];
    }
    case "customer.subscription.updated":
      return [mapSubscriptionUpdated(event.id, event.data.object, prices, new Date(occurredAt))];
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      return [
        {
          id: event.id,
          provider: "stripe",
          occurredAt,
          businessId: sub.metadata?.[META.businessId] ?? null,
          type: "subscription.canceled",
          providerSubscriptionId: sub.id,
        },
      ];
    }
    default:
      return [];
  }
}
