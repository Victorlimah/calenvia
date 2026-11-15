import type { PlanId } from "@/lib/plans";

/**
 * Tipos normalizados da cobrança (CAL-076). Página, action, webhook e cron só falam com estes
 * tipos, nunca com os do Stripe.
 */
export type ProviderName = "mock" | "stripe" | "manual";

export type DesiredAddon = { addonId: string; priceId: string; quantity: number };

/** Plano + extras com quantidade: o que a assinatura deve cobrar. */
export type DesiredItems = { plan: PlanId; priceId: string; addons: DesiredAddon[] };

export type InvoiceLine = { description: string; quantity: number; amount_cents: number };

export type NormalizedInvoice = {
  providerInvoiceId: string;
  amountCents: number;
  periodStart: string | null;
  periodEnd: string | null;
  hostedUrl: string | null;
  lines: InvoiceLine[];
};

type Base = {
  /** Id do evento no provedor (idempotência). */
  id: string;
  provider: ProviderName;
  /** Quando aconteceu (ISO). */
  occurredAt: string;
  businessId: string | null;
};

export type BillingEvent =
  | (Base & {
      type: "checkout.completed";
      /** Id da linha em `checkout_sessions` (no Stripe vai em metadata). */
      checkoutSessionId: string;
      providerSubscriptionId: string;
      providerCustomerId: string | null;
      /** Item base (plano) da assinatura no provedor. */
      providerItemId: string | null;
      /** Itens dos extras no provedor, por addon_id. */
      addonItems?: Record<string, string>;
      periodStart: string;
      periodEnd: string;
      trialEnd?: string | null;
    })
  | (Base & {
      type: "invoice.paid";
      providerSubscriptionId: string;
      invoice: NormalizedInvoice;
    })
  | (Base & {
      type: "invoice.payment_failed";
      providerSubscriptionId: string;
      invoice: NormalizedInvoice;
    })
  | (Base & {
      type: "subscription.updated";
      providerSubscriptionId: string;
      plan?: PlanId;
      priceId?: string | null;
      cancelAtPeriodEnd?: boolean;
      /** Downgrade agendado para o fim do ciclo (null = nenhum). */
      pendingPlan?: PlanId | null;
      pendingPriceId?: string | null;
      periodStart?: string | null;
      periodEnd?: string | null;
    })
  | (Base & {
      type: "subscription.canceled";
      providerSubscriptionId: string;
    });

export type BillingEventType = BillingEvent["type"];
