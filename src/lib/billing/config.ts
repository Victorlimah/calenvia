/**
 * Configuração da cobrança (CAL-076). Ver docs/planos/CAL-076.md.
 *
 * Teste grátis (CAL-079) ainda não decidido: 0 = sem teste. Se virar > 0, o checkout cria a
 * assinatura com `trial_end` e status `active`.
 */
import { isBillingEnabled } from "@/lib/config/access";

export const TRIAL_DAYS = 0;

export type BillingProviderId = "mock" | "stripe";

/** Provedor em uso (`BILLING_PROVIDER`). Sem valor: mock (pagamento simulado). */
export function billingProviderId(
  value: string | undefined = process.env.BILLING_PROVIDER,
): BillingProviderId {
  return value === "stripe" ? "stripe" : "mock";
}

/**
 * Pagamento simulado ligado? (botões de simulação no /admin e a tela /pagamento-simulado).
 * Com a cobrança desligada (CAL-135, `BILLING_ENABLED=false`) nada de pagamento aparece.
 */
export function isMockBilling(
  value: string | undefined = process.env.BILLING_PROVIDER,
  enabled: boolean = isBillingEnabled(),
): boolean {
  return enabled && billingProviderId(value) === "mock";
}
