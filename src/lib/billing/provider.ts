import "server-only";
import { billingProviderId, type BillingProviderId } from "./config";
import type { SubscriptionRow } from "./events";
import { mockProvider } from "./mock";
import type { BillingEvent, DesiredItems } from "./types";

export type CheckoutInput = {
  businessId: string;
  /** Id da linha em `checkout_sessions`. */
  checkoutSessionId: string;
  items: DesiredItems;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Interface única do gateway (CLAUDE.md §2, CAL-076). O resto do sistema não sabe qual provedor
 * está em uso: tudo que muda a assinatura vira um `BillingEvent` aplicado por
 * `applyBillingEvent` (no mock, na hora; no Stripe, pelo webhook).
 */
export interface BillingProvider {
  id: BillingProviderId;
  /** Cria a sessão de pagamento e devolve para onde mandar o dono. */
  createCheckout(input: CheckoutInput): Promise<{ url: string; providerSessionId: string }>;
  /** Deixa os extras da assinatura iguais aos de `business_addons` (com cobrança proporcional). */
  syncItems(subscription: SubscriptionRow): Promise<void>;
  /** Upgrade na hora (proporcional) ou downgrade no fim do ciclo. */
  changePlan(
    subscription: SubscriptionRow,
    target: { plan: DesiredItems["plan"]; priceId: string },
    when: "now" | "period_end",
  ): Promise<void>;
  /** Cancela no fim do período pago. */
  cancel(subscription: SubscriptionRow): Promise<void>;
  /** Desfaz o cancelamento agendado. */
  resume(subscription: SubscriptionRow): Promise<void>;
  /** Portal do gateway para atualizar o cartão (null = não tem). */
  customerPortalUrl(subscription: SubscriptionRow, returnUrl: string): Promise<string | null>;
  /** Valida e converte o webhook em eventos normalizados. Lança erro se inválido. */
  parseWebhook(request: Request): Promise<BillingEvent[]>;
}

export class WebhookRejected extends Error {}

export async function getBillingProvider(
  id: BillingProviderId = billingProviderId(),
): Promise<BillingProvider> {
  if (id === "stripe") {
    const { stripeProvider } = await import("./stripe");
    return stripeProvider;
  }
  return mockProvider;
}
