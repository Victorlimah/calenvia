import "server-only";
import { randomUUID } from "node:crypto";
import { addMonths } from "date-fns";
import { appUrl } from "@/lib/hosts";
import { PLANS, type PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyBillingEvent, type ApplyResult, type SubscriptionRow } from "./events";
import { loadSubscriptionItems } from "./items";
import type { BillingProvider } from "./provider";
import type { BillingEvent, InvoiceLine, NormalizedInvoice } from "./types";

/**
 * Provedor simulado (BILLING_PROVIDER=mock): pagamento que sempre aprova, para desenvolvimento e
 * contas de teste. Gera os mesmos eventos normalizados que o webhook do Stripe vai gerar.
 */
const evtId = () => `mock_evt_${randomUUID()}`;
const base = (businessId: string | null) => ({
  id: evtId(),
  provider: "mock" as const,
  occurredAt: new Date().toISOString(),
  businessId,
});

function invoice(
  lines: InvoiceLine[],
  periodStart: Date | null,
  periodEnd: Date | null,
): NormalizedInvoice {
  return {
    providerInvoiceId: `mock_in_${randomUUID()}`,
    amountCents: lines.reduce((s, l) => s + l.quantity * l.amount_cents, 0),
    periodStart: periodStart?.toISOString() ?? null,
    periodEnd: periodEnd?.toISOString() ?? null,
    hostedUrl: null,
    lines,
  };
}

async function applyAll(events: BillingEvent[]): Promise<ApplyResult> {
  let last: ApplyResult = { status: "duplicate" };
  for (const e of events) {
    last = await applyBillingEvent(e);
    if (last.status === "error") return last;
  }
  return last;
}

/** "Aprovar pagamento" na tela /pagamento-simulado: conclui o checkout e paga a 1ª fatura. */
export async function approveMockCheckout(checkoutSessionId: string): Promise<ApplyResult> {
  const db = createSupabaseAdminClient();
  const { data: session } = await db
    .from("checkout_sessions")
    .select("*")
    .eq("id", checkoutSessionId)
    .eq("provider", "mock")
    .maybeSingle();
  if (!session) return { status: "error", error: "Pagamento não encontrado." };
  if (session.status === "completed") return { status: "duplicate" };
  if (session.status !== "open") return { status: "error", error: "Este pagamento expirou." };

  const start = new Date();
  const end = addMonths(start, 1);
  const providerSubscriptionId = `mock_sub_${randomUUID()}`;
  const completed = await applyBillingEvent({
    ...base(session.business_id),
    type: "checkout.completed",
    checkoutSessionId: session.id,
    providerSubscriptionId,
    providerCustomerId: `mock_cus_${session.business_id}`,
    providerItemId: null,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  });
  if (completed.status === "error") return completed;
  const { items } = await loadSubscriptionItems(db, session.business_id);
  return applyBillingEvent({
    ...base(session.business_id),
    type: "invoice.paid",
    providerSubscriptionId,
    invoice: invoice(items, start, end),
  });
}

/** Admin (só mock): renovação do ciclo, com a fatura do mês paga. */
export async function simulateRenewal(sub: SubscriptionRow): Promise<ApplyResult> {
  const db = createSupabaseAdminClient();
  const start = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
  const end = addMonths(start, 1);
  const target = sub.pending_plan
    ? { plan: sub.pending_plan as PlanId, priceId: sub.pending_price_id }
    : undefined;
  const { items } = await loadSubscriptionItems(db, sub.business_id, target);
  const events: BillingEvent[] = [];
  if (sub.cancel_at_period_end) {
    events.push({
      ...base(sub.business_id),
      type: "subscription.canceled",
      providerSubscriptionId: sub.provider_subscription_id!,
    });
  } else {
    events.push({
      ...base(sub.business_id),
      type: "invoice.paid",
      providerSubscriptionId: sub.provider_subscription_id!,
      invoice: invoice(items, start, end),
    });
  }
  return applyAll(events);
}

/** Admin (só mock): a cobrança do ciclo falhou. */
export async function simulatePaymentFailure(sub: SubscriptionRow): Promise<ApplyResult> {
  const db = createSupabaseAdminClient();
  const { items } = await loadSubscriptionItems(db, sub.business_id);
  return applyBillingEvent({
    ...base(sub.business_id),
    type: "invoice.payment_failed",
    providerSubscriptionId: sub.provider_subscription_id!,
    invoice: invoice(items, null, null),
  });
}

/** Admin (só mock): o dono pagou a fatura em atraso. */
export async function simulateInvoicePayment(sub: SubscriptionRow): Promise<ApplyResult> {
  const db = createSupabaseAdminClient();
  const { data: open } = await db
    .from("invoices")
    .select("provider_invoice_id, amount_cents, period_start, period_end, lines")
    .eq("business_id", sub.business_id)
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const inv: NormalizedInvoice = open
    ? {
        providerInvoiceId: open.provider_invoice_id,
        amountCents: open.amount_cents,
        periodStart: open.period_start,
        periodEnd: open.period_end,
        hostedUrl: null,
        lines: open.lines as unknown as InvoiceLine[],
      }
    : invoice((await loadSubscriptionItems(db, sub.business_id)).items, null, null);
  return applyBillingEvent({
    ...base(sub.business_id),
    type: "invoice.paid",
    providerSubscriptionId: sub.provider_subscription_id!,
    invoice: inv,
  });
}

/** Valor proporcional ao que falta do ciclo (centavos, arredondado). */
export function prorate(diffCents: number, periodStart: Date, periodEnd: Date, now: Date): number {
  const total = periodEnd.getTime() - periodStart.getTime();
  if (total <= 0) return 0;
  const left = Math.min(Math.max(periodEnd.getTime() - now.getTime(), 0), total);
  return Math.round((diffCents * left) / total);
}

export const mockProvider: BillingProvider = {
  id: "mock",

  async createCheckout(input) {
    return {
      url: appUrl(`/pagamento-simulado/${input.checkoutSessionId}`),
      providerSessionId: `mock_cs_${input.checkoutSessionId}`,
    };
  },

  async syncItems() {
    // No mock os extras valem direto de business_addons; nada a sincronizar.
  },

  async changePlan(sub, target, when) {
    const db = createSupabaseAdminClient();
    const providerSubscriptionId = sub.provider_subscription_id!;
    if (when === "period_end") {
      const r = await applyBillingEvent({
        ...base(sub.business_id),
        type: "subscription.updated",
        providerSubscriptionId,
        pendingPlan: target.plan,
        pendingPriceId: target.priceId,
      });
      if (r.status === "error") throw new Error(r.error);
      return;
    }
    const before = await loadSubscriptionItems(db, sub.business_id);
    const after = await loadSubscriptionItems(db, sub.business_id, target);
    const r = await applyBillingEvent({
      ...base(sub.business_id),
      type: "subscription.updated",
      providerSubscriptionId,
      plan: target.plan,
      priceId: target.priceId,
      pendingPlan: null,
      pendingPriceId: null,
    });
    if (r.status === "error") throw new Error(r.error);
    const amount =
      sub.current_period_start && sub.current_period_end
        ? prorate(
            after.totalCents - before.totalCents,
            new Date(sub.current_period_start),
            new Date(sub.current_period_end),
            new Date(),
          )
        : 0;
    if (amount > 0) {
      const paid = await applyBillingEvent({
        ...base(sub.business_id),
        type: "invoice.paid",
        providerSubscriptionId,
        invoice: invoice(
          [
            {
              description: `Troca para o plano ${PLANS[target.plan].name} (proporcional)`,
              quantity: 1,
              amount_cents: amount,
            },
          ],
          null,
          null,
        ),
      });
      if (paid.status === "error") throw new Error(paid.error);
    }
  },

  async cancel(sub) {
    const r = await applyBillingEvent({
      ...base(sub.business_id),
      type: "subscription.updated",
      providerSubscriptionId: sub.provider_subscription_id!,
      cancelAtPeriodEnd: true,
    });
    if (r.status === "error") throw new Error(r.error);
  },

  async resume(sub) {
    const r = await applyBillingEvent({
      ...base(sub.business_id),
      type: "subscription.updated",
      providerSubscriptionId: sub.provider_subscription_id!,
      cancelAtPeriodEnd: false,
    });
    if (r.status === "error") throw new Error(r.error);
  },

  async customerPortalUrl() {
    return null;
  },

  async parseWebhook() {
    const { WebhookRejected } = await import("./provider");
    throw new WebhookRejected("O pagamento simulado não usa webhook.");
  },
};
