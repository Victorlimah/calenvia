import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { mapStripeEvent, mapSubscriptionUpdated, META, type PriceLookup } from "./stripe-map";

// CAL-076 fase 6: eventos do Stripe (API 2025-08-27.basil) → eventos normalizados. Sem rede.
const prices: PriceLookup = new Map([
  ["price_pro", { priceId: "db-pro", plan: "pro", addonId: null }],
  ["price_basic", { priceId: "db-basic", plan: "basic", addonId: null }],
  ["price_msg", { priceId: "db-msg", plan: null, addonId: "addon-msg" }],
]);

const T0 = 1_800_000_000; // unix
const T1 = T0 + 30 * 24 * 3600;

function subscription(over: Partial<Stripe.Subscription> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    object: "subscription",
    cancel_at_period_end: false,
    trial_end: null,
    metadata: { [META.businessId]: "biz-1" },
    items: {
      object: "list",
      data: [
        {
          id: "si_plan",
          price: { id: "price_pro" },
          metadata: {},
          current_period_start: T0,
          current_period_end: T1,
        },
        {
          id: "si_msg",
          price: { id: "price_msg" },
          metadata: {},
          current_period_start: T0,
          current_period_end: T1,
        },
      ],
    },
    ...over,
  } as unknown as Stripe.Subscription;
}

const event = (type: string, object: unknown): Stripe.Event =>
  ({ id: `evt_${type}`, type, created: T0, data: { object } }) as unknown as Stripe.Event;

describe("mapeamento do Stripe", () => {
  it("checkout.session.completed → checkout.completed com itens e período", () => {
    const [e] = mapStripeEvent(
      event("checkout.session.completed", {
        mode: "subscription",
        customer: "cus_1",
        subscription: "sub_1",
        metadata: { [META.businessId]: "biz-1", [META.checkoutSessionId]: "cs-db-1" },
      }),
      prices,
      subscription(),
    );
    expect(e).toMatchObject({
      type: "checkout.completed",
      provider: "stripe",
      id: "evt_checkout.session.completed",
      businessId: "biz-1",
      checkoutSessionId: "cs-db-1",
      providerSubscriptionId: "sub_1",
      providerCustomerId: "cus_1",
      providerItemId: "si_plan",
      addonItems: { "addon-msg": "si_msg" },
      periodStart: new Date(T0 * 1000).toISOString(),
      periodEnd: new Date(T1 * 1000).toISOString(),
    });
  });

  it("checkout sem metadata da Calenvia ou de pagamento avulso é ignorado", () => {
    expect(
      mapStripeEvent(event("checkout.session.completed", { mode: "payment" }), prices, null),
    ).toEqual([]);
    expect(
      mapStripeEvent(
        event("checkout.session.completed", { mode: "subscription", metadata: {} }),
        prices,
        subscription(),
      ),
    ).toEqual([]);
  });

  it("invoice.paid e invoice.payment_failed → fatura normalizada", () => {
    const invoice = {
      id: "in_1",
      status: "paid",
      amount_paid: 5490,
      amount_due: 5490,
      hosted_invoice_url: "https://invoice.stripe.com/i/1",
      parent: { subscription_details: { subscription: "sub_1", metadata: {} } },
      lines: {
        data: [
          {
            description: "Calenvia Pro",
            quantity: 1,
            amount: 4490,
            period: { start: T0, end: T1 },
          },
          {
            description: "+100 mensagens/mês",
            quantity: 1,
            amount: 1000,
            period: { start: T0, end: T1 },
          },
        ],
      },
    };
    const [paid] = mapStripeEvent(event("invoice.paid", invoice), prices);
    expect(paid).toMatchObject({
      type: "invoice.paid",
      providerSubscriptionId: "sub_1",
      invoice: {
        providerInvoiceId: "in_1",
        amountCents: 5490,
        hostedUrl: "https://invoice.stripe.com/i/1",
        periodStart: new Date(T0 * 1000).toISOString(),
      },
    });
    const [failed] = mapStripeEvent(
      event("invoice.payment_failed", { ...invoice, status: "open", amount_paid: 0 }),
      prices,
    );
    expect(failed).toMatchObject({
      type: "invoice.payment_failed",
      invoice: { amountCents: 5490 },
    });
  });

  it("fatura sem assinatura (avulsa) é ignorada", () => {
    expect(
      mapStripeEvent(
        event("invoice.paid", { id: "in_2", parent: null, lines: { data: [] } }),
        prices,
      ),
    ).toEqual([]);
  });

  it("subscription.updated: plano pelo preço, cancelamento e período", () => {
    const e = mapSubscriptionUpdated("evt_u", subscription({ cancel_at_period_end: true }), prices);
    expect(e).toMatchObject({
      type: "subscription.updated",
      plan: "pro",
      priceId: "db-pro",
      pendingPlan: null,
      cancelAtPeriodEnd: true,
      periodEnd: new Date(T1 * 1000).toISOString(),
    });
  });

  it("subscription.updated com downgrade agendado: vira troca pendente até o ciclo virar", () => {
    const sub = subscription({
      metadata: {
        [META.pendingPlan]: "basic",
        [META.pendingFrom]: new Date(T1 * 1000).toISOString(),
      },
      items: {
        object: "list",
        data: [
          {
            id: "si_plan",
            price: { id: "price_basic" },
            metadata: {},
            current_period_start: T0,
            current_period_end: T1,
          },
        ],
      } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
    });
    const before = mapSubscriptionUpdated("evt_a", sub, prices, new Date((T0 + 60) * 1000));
    expect(before).toMatchObject({ pendingPlan: "basic", pendingPriceId: "db-basic" });
    expect("plan" in before && before.plan).toBeFalsy();
    const after = mapSubscriptionUpdated("evt_b", sub, prices, new Date((T1 + 60) * 1000));
    expect(after).toMatchObject({ plan: "basic", pendingPlan: null });
  });

  it("customer.subscription.deleted → subscription.canceled; outros eventos ignorados", () => {
    expect(
      mapStripeEvent(event("customer.subscription.deleted", subscription()), prices),
    ).toMatchObject([{ type: "subscription.canceled", providerSubscriptionId: "sub_1" }]);
    expect(mapStripeEvent(event("customer.created", {}), prices)).toEqual([]);
  });

  it("assinatura do webhook: o SDK valida o corpo assinado e recusa o adulterado", async () => {
    const stripe = new Stripe("sk_test_x", { apiVersion: "2025-08-27.basil" });
    const secret = "whsec_teste";
    const payload = JSON.stringify({ id: "evt_1", object: "event", type: "customer.created" });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const ok = await stripe.webhooks.constructEventAsync(payload, header, secret);
    expect(ok.id).toBe("evt_1");
    await expect(
      stripe.webhooks.constructEventAsync(payload.replace("evt_1", "evt_2"), header, secret),
    ).rejects.toThrow();
  });
});
