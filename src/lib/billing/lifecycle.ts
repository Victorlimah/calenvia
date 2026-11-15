import "server-only";
import { PLAN_ORDER, type PlanId, type PlanStatus } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyBillingEvent, openSubscription, type SubscriptionRow } from "./events";
import { getCurrentPrices } from "./prices-server";
import { providerForSubscription } from "./provider";
import { nextPlanStatus } from "./status";

type Db = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Ciclo de vida da assinatura (CAL-077, CAL-078): troca de plano, cancelamento e o cron diário.
 * Tudo passa pelo provedor da assinatura e vira evento normalizado.
 */

/** Assinatura "manual" antiga sem id no provedor ganha um (os eventos procuram por ele). */
async function withProviderId(db: Db, sub: SubscriptionRow): Promise<SubscriptionRow> {
  if (sub.provider_subscription_id) return sub;
  const id = `${sub.provider}_${sub.id}`;
  await db.from("subscriptions").update({ provider_subscription_id: id }).eq("id", sub.id);
  return { ...sub, provider_subscription_id: id };
}

export async function currentSubscription(
  businessId: string,
  db: Db = createSupabaseAdminClient(),
): Promise<SubscriptionRow | null> {
  const sub = await openSubscription(db, businessId);
  return sub ? withProviderId(db, sub) : null;
}

export type PlanChangeKind = "upgrade" | "downgrade" | "same";

export function planChangeKind(from: PlanId, to: PlanId): PlanChangeKind {
  const a = PLAN_ORDER.indexOf(from);
  const b = PLAN_ORDER.indexOf(to);
  return b > a ? "upgrade" : b < a ? "downgrade" : "same";
}

export type LifecycleResult = { ok: true; message: string } | { ok: false; error: string };

/** Upgrade na hora (proporcional); downgrade no fim do ciclo; mesmo plano desfaz o agendado. */
export async function changeSubscriptionPlan(
  businessId: string,
  target: PlanId,
): Promise<LifecycleResult> {
  const db = createSupabaseAdminClient();
  const sub = await currentSubscription(businessId, db);
  if (!sub || !["active", "past_due"].includes(sub.status)) {
    return { ok: false, error: "Sua assinatura não está ativa." };
  }
  const provider = await providerForSubscription(sub);
  const kind = planChangeKind(sub.plan as PlanId, target);
  if (kind === "same") {
    if (!sub.pending_plan) return { ok: true, message: "Você já está neste plano." };
    // Agendar o próprio plano = desfazer o downgrade agendado.
    await provider.changePlan(sub, { plan: target, priceId: sub.price_id! }, "period_end");
    return { ok: true, message: "Troca de plano desfeita." };
  }
  const prices = await getCurrentPrices({ fresh: true });
  const priceId = prices.plans[target].priceId;
  if (!priceId) return { ok: false, error: "Não foi possível carregar os preços. Tente de novo." };
  try {
    await provider.changePlan(
      sub,
      { plan: target, priceId },
      kind === "upgrade" ? "now" : "period_end",
    );
  } catch (e) {
    console.error("[billing] trocar plano", e);
    return { ok: false, error: "Não foi possível trocar o plano. Tente de novo." };
  }
  return {
    ok: true,
    message:
      kind === "upgrade"
        ? "Plano atualizado! A diferença deste mês foi cobrada de forma proporcional."
        : "Troca agendada: o plano novo começa na próxima cobrança.",
  };
}

export async function cancelSubscription(businessId: string): Promise<LifecycleResult> {
  const sub = await currentSubscription(businessId);
  if (!sub) return { ok: false, error: "Você não tem assinatura ativa." };
  if (sub.cancel_at_period_end) return { ok: true, message: "O cancelamento já está agendado." };
  try {
    await (await providerForSubscription(sub)).cancel(sub);
  } catch (e) {
    console.error("[billing] cancelar", e);
    return { ok: false, error: "Não foi possível cancelar. Tente de novo." };
  }
  return { ok: true, message: "Cancelamento agendado para o fim do período pago." };
}

export async function resumeSubscription(businessId: string): Promise<LifecycleResult> {
  const sub = await currentSubscription(businessId);
  if (!sub || !sub.cancel_at_period_end) return { ok: true, message: "Nada a desfazer." };
  try {
    await (await providerForSubscription(sub)).resume(sub);
  } catch (e) {
    console.error("[billing] reativar", e);
    return { ok: false, error: "Não foi possível desfazer o cancelamento. Tente de novo." };
  }
  return { ok: true, message: "Pronto! Sua assinatura continua normalmente." };
}

export type BillingCronSummary = {
  suspended: number;
  canceled: number;
  downgraded: number;
  errors: number;
};

/**
 * Cron diário (`/api/cron/billing`): suspende quem passou da carência e aplica cancelamentos e
 * downgrades agendados cujo ciclo terminou. Vale para mock, manual e Stripe (no Stripe o webhook
 * pode chegar antes; os eventos são idempotentes no efeito).
 */
export async function runBillingCron(
  now: Date = new Date(),
  db: Db = createSupabaseAdminClient(),
): Promise<BillingCronSummary> {
  const summary: BillingCronSummary = { suspended: 0, canceled: 0, downgraded: 0, errors: 0 };

  // 1) Carência vencida → suspenso.
  const { data: late } = await db
    .from("subscriptions")
    .select("id, business_id, past_due_since, businesses!inner(plan_status)")
    .eq("status", "past_due")
    .not("past_due_since", "is", null);
  for (const s of late ?? []) {
    const current = (s.businesses as { plan_status: string }).plan_status as PlanStatus;
    const next = nextPlanStatus(
      current,
      { type: "grace_check", pastDueSince: s.past_due_since },
      now,
    );
    if (next !== "suspended" || current === "suspended") continue;
    const a = await db.from("subscriptions").update({ status: "suspended" }).eq("id", s.id);
    const b = await db
      .from("businesses")
      .update({ plan_status: "suspended" })
      .eq("id", s.business_id);
    if (a.error || b.error) summary.errors++;
    else summary.suspended++;
  }

  // 2) Fim do ciclo com cancelamento ou downgrade agendado.
  const { data: due } = await db
    .from("subscriptions")
    .select("*")
    .neq("status", "canceled")
    .lte("current_period_end", now.toISOString())
    .or("cancel_at_period_end.eq.true,pending_plan.not.is.null");
  for (const raw of due ?? []) {
    const sub = await withProviderId(db, raw);
    try {
      if (sub.cancel_at_period_end) {
        const r = await applyBillingEvent(
          {
            id: `cron_cancel_${sub.id}_${sub.current_period_end}`,
            provider: sub.provider as "mock" | "stripe" | "manual",
            occurredAt: now.toISOString(),
            businessId: sub.business_id,
            type: "subscription.canceled",
            providerSubscriptionId: sub.provider_subscription_id!,
          },
          db,
        );
        if (r.status === "error") throw new Error(r.error);
        summary.canceled++;
      } else if (sub.pending_plan && sub.pending_price_id) {
        const provider = await providerForSubscription(sub);
        await provider.changePlan(
          sub,
          { plan: sub.pending_plan as PlanId, priceId: sub.pending_price_id },
          "at_renewal",
        );
        summary.downgraded++;
      }
    } catch (e) {
      console.error("[billing] cron", sub.id, e);
      summary.errors++;
    }
  }
  return summary;
}
