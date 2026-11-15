import "server-only";
import { track } from "@/lib/metrics";
import type { PlanId, PlanStatus } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables } from "@/lib/supabase/types";
import { nextPlanStatus } from "./status";
import type { BillingEvent, DesiredAddon, NormalizedInvoice } from "./types";

type Db = ReturnType<typeof createSupabaseAdminClient>;
export type SubscriptionRow = Tables<"subscriptions">;

export type ApplyResult =
  | { status: "applied"; businessId: string | null }
  | { status: "duplicate" }
  | { status: "error"; error: string };

class BillingError extends Error {}

/**
 * Aplica um evento normalizado de cobrança (CAL-076). Idempotente: todo evento entra antes em
 * `billing_events` (provider + id único). Repetido e já processado = ignorado; repetido que
 * deu erro antes = tenta de novo.
 */
export async function applyBillingEvent(
  event: BillingEvent,
  db: Db = createSupabaseAdminClient(),
): Promise<ApplyResult> {
  const { data: inserted, error: insertError } = await db
    .from("billing_events")
    .insert({
      provider: event.provider,
      provider_event_id: event.id,
      type: event.type,
      payload: event as unknown as { [key: string]: Json },
      business_id: event.businessId,
    })
    .select("id")
    .maybeSingle();

  let rowId = inserted?.id ?? null;
  if (insertError) {
    if (insertError.code !== "23505") return { status: "error", error: insertError.message };
    const { data: existing } = await db
      .from("billing_events")
      .select("id, processed_at")
      .eq("provider", event.provider)
      .eq("provider_event_id", event.id)
      .single();
    if (!existing || existing.processed_at) return { status: "duplicate" };
    rowId = existing.id;
  }

  try {
    const businessId = await dispatch(db, event);
    await db
      .from("billing_events")
      .update({ processed_at: new Date().toISOString(), error: null, business_id: businessId })
      .eq("id", rowId!);
    return { status: "applied", businessId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .from("billing_events")
      .update({ error: message.slice(0, 500) })
      .eq("id", rowId!);
    if (!(e instanceof BillingError)) console.error("[billing] evento", event.type, event.id, e);
    return { status: "error", error: message };
  }
}

async function dispatch(db: Db, event: BillingEvent): Promise<string | null> {
  switch (event.type) {
    case "checkout.completed":
      return checkoutCompleted(db, event);
    case "invoice.paid":
      return invoiceEvent(db, event, "paid");
    case "invoice.payment_failed":
      return invoiceEvent(db, event, "failed");
    case "subscription.updated":
      return subscriptionUpdated(db, event);
    case "subscription.canceled":
      return subscriptionCanceled(db, event);
  }
}

function must<R extends { data: unknown; error: { message: string } | null }>(
  res: R,
  what: string,
): NonNullable<R["data"]> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null) throw new BillingError(`${what}: não encontrado`);
  return res.data as NonNullable<R["data"]>;
}

async function setBusinessStatus(
  db: Db,
  businessId: string,
  fields: { plan?: PlanId; plan_status?: PlanStatus },
) {
  must(
    await db.from("businesses").update(fields).eq("id", businessId).select("id").single(),
    "atualizar negócio",
  );
}

async function businessStatus(db: Db, businessId: string): Promise<PlanStatus> {
  const b = must(
    await db.from("businesses").select("plan_status").eq("id", businessId).single(),
    "negócio",
  );
  return b.plan_status as PlanStatus;
}

export async function subscriptionByProviderId(
  db: Db,
  providerSubscriptionId: string,
): Promise<SubscriptionRow> {
  return must(
    await db
      .from("subscriptions")
      .select("*")
      .eq("provider_subscription_id", providerSubscriptionId)
      .maybeSingle(),
    "assinatura",
  );
}

/** Assinatura não cancelada do negócio (no máximo uma, pelo índice único). */
export async function openSubscription(
  db: Db,
  businessId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .neq("status", "canceled")
    .maybeSingle();
  if (error) throw new Error(`assinatura: ${error.message}`);
  return data;
}

async function checkoutCompleted(
  db: Db,
  event: Extract<BillingEvent, { type: "checkout.completed" }>,
): Promise<string> {
  const session = must(
    await db.from("checkout_sessions").select("*").eq("id", event.checkoutSessionId).maybeSingle(),
    "sessão de checkout",
  );
  const businessId = session.business_id;
  if (session.status === "completed") return businessId;

  const plan = session.plan as PlanId;
  const now = new Date().toISOString();
  const fields = {
    plan,
    price_id: session.price_id,
    status: "active",
    provider: event.provider,
    provider_subscription_id: event.providerSubscriptionId,
    provider_customer_id: event.providerCustomerId,
    provider_item_id: event.providerItemId,
    current_period_start: event.periodStart,
    current_period_end: event.periodEnd,
    trial_end: event.trialEnd ?? null,
    cancel_at_period_end: false,
    pending_plan: null,
    pending_price_id: null,
    past_due_since: null,
    updated_at: now,
  };
  const existing = await openSubscription(db, businessId);
  if (existing) {
    must(
      await db.from("subscriptions").update(fields).eq("id", existing.id).select("id").single(),
      "atualizar assinatura",
    );
  } else {
    must(
      await db
        .from("subscriptions")
        .insert({ ...fields, business_id: businessId })
        .select("id")
        .single(),
      "criar assinatura",
    );
  }

  const addons = (session.addons as unknown as DesiredAddon[]) ?? [];
  await replaceCatalogAddons(db, businessId, addons, event.addonItems ?? {}, session.created_by);

  await setBusinessStatus(db, businessId, { plan, plan_status: "active" });
  must(
    await db
      .from("checkout_sessions")
      .update({ status: "completed", completed_at: now })
      .eq("id", session.id)
      .select("id")
      .single(),
    "concluir checkout",
  );
  await track("subscription_started", { businessId, props: { plan, provider: event.provider } });
  return businessId;
}

/**
 * Extras do catálogo do negócio passam a ser exatamente `addons` (os `custom` não mudam).
 * Recalcula `addon_messages`/`addon_members`.
 */
export async function replaceCatalogAddons(
  db: Db,
  businessId: string,
  addons: DesiredAddon[],
  providerItems: Record<string, string> = {},
  createdBy: string | null = null,
) {
  const { data: current, error } = await db
    .from("business_addons")
    .select("id, addon_id, price_id, quantity")
    .eq("business_id", businessId)
    .eq("is_custom", false)
    .is("removed_at", null);
  if (error) throw new Error(`extras: ${error.message}`);
  const now = new Date().toISOString();
  for (const row of current ?? []) {
    const want = addons.find((a) => a.addonId === row.addon_id);
    if (!want) {
      await db.from("business_addons").update({ removed_at: now }).eq("id", row.id);
    } else if (want.quantity !== row.quantity || providerItems[row.addon_id]) {
      await db
        .from("business_addons")
        .update({
          quantity: want.quantity,
          provider_item_id: providerItems[row.addon_id] ?? undefined,
        })
        .eq("id", row.id);
    }
  }
  const toInsert = addons.filter((a) => !(current ?? []).some((r) => r.addon_id === a.addonId));
  if (toInsert.length > 0) {
    must(
      await db
        .from("business_addons")
        .insert(
          toInsert.map((a) => ({
            business_id: businessId,
            addon_id: a.addonId,
            price_id: a.priceId,
            quantity: a.quantity,
            provider_item_id: providerItems[a.addonId] ?? null,
            created_by: createdBy,
          })),
        )
        .select("id"),
      "criar extras",
    );
  }
  await recomputeAddons(db, businessId);
}

export async function recomputeAddons(db: Db, businessId: string) {
  const { error } = await db.rpc("recompute_business_addons", { p_business_id: businessId });
  if (error) throw new Error(`recalcular extras: ${error.message}`);
}

async function upsertInvoice(
  db: Db,
  businessId: string,
  provider: string,
  invoice: NormalizedInvoice,
  status: "paid" | "failed",
) {
  must(
    await db
      .from("invoices")
      .upsert(
        {
          business_id: businessId,
          provider,
          provider_invoice_id: invoice.providerInvoiceId,
          amount_cents: invoice.amountCents,
          status,
          period_start: invoice.periodStart,
          period_end: invoice.periodEnd,
          paid_at: status === "paid" ? new Date().toISOString() : null,
          hosted_url: invoice.hostedUrl,
          lines: invoice.lines as unknown as Json[],
        },
        { onConflict: "provider_invoice_id" },
      )
      .select("id")
      .single(),
    "fatura",
  );
}

async function invoiceEvent(
  db: Db,
  event: Extract<BillingEvent, { type: "invoice.paid" | "invoice.payment_failed" }>,
  result: "paid" | "failed",
): Promise<string> {
  const sub = await subscriptionByProviderId(db, event.providerSubscriptionId);
  const businessId = sub.business_id;
  await upsertInvoice(db, businessId, event.provider, event.invoice, result);

  const current = await businessStatus(db, businessId);
  const next = nextPlanStatus(
    current,
    { type: result === "paid" ? "paid" : "payment_failed" },
    new Date(),
  );
  const now = new Date().toISOString();

  if (result === "paid") {
    const renewing =
      sub.pending_plan &&
      event.invoice.periodStart &&
      sub.current_period_end &&
      new Date(event.invoice.periodStart) >= new Date(sub.current_period_end);
    // Downgrade agendado entra quando começa o ciclo novo.
    const plan = renewing ? (sub.pending_plan as PlanId) : (sub.plan as PlanId);
    must(
      await db
        .from("subscriptions")
        .update({
          status: "active",
          past_due_since: null,
          current_period_start: event.invoice.periodStart ?? sub.current_period_start,
          current_period_end: event.invoice.periodEnd ?? sub.current_period_end,
          ...(renewing
            ? { plan, price_id: sub.pending_price_id, pending_plan: null, pending_price_id: null }
            : {}),
          updated_at: now,
        })
        .eq("id", sub.id)
        .select("id")
        .single(),
      "atualizar assinatura",
    );
    await setBusinessStatus(db, businessId, { plan, plan_status: next });
    if (renewing) await dropAddonsNotIn(db, businessId, plan);
  } else {
    must(
      await db
        .from("subscriptions")
        .update({
          status: next === "past_due" ? "past_due" : sub.status,
          past_due_since: sub.past_due_since ?? now,
          updated_at: now,
        })
        .eq("id", sub.id)
        .select("id")
        .single(),
      "atualizar assinatura",
    );
    await setBusinessStatus(db, businessId, { plan_status: next });
  }
  return businessId;
}

/** Tira os extras que o plano não aceita (troca de plano). */
export async function dropAddonsNotIn(db: Db, businessId: string, plan: PlanId) {
  const { data } = await db
    .from("business_addons")
    .select("id, billing_addons!inner(plans)")
    .eq("business_id", businessId)
    .eq("is_custom", false)
    .is("removed_at", null);
  const drop = (data ?? []).filter(
    (r) => !((r.billing_addons as { plans: string[] }).plans ?? []).includes(plan),
  );
  if (drop.length === 0) return;
  await db
    .from("business_addons")
    .update({ removed_at: new Date().toISOString() })
    .in(
      "id",
      drop.map((r) => r.id),
    );
  await recomputeAddons(db, businessId);
}

async function subscriptionUpdated(
  db: Db,
  event: Extract<BillingEvent, { type: "subscription.updated" }>,
): Promise<string> {
  const sub = await subscriptionByProviderId(db, event.providerSubscriptionId);
  const patch: Partial<SubscriptionRow> = { updated_at: new Date().toISOString() };
  if (event.plan !== undefined) patch.plan = event.plan;
  if (event.priceId !== undefined) patch.price_id = event.priceId;
  if (event.cancelAtPeriodEnd !== undefined) patch.cancel_at_period_end = event.cancelAtPeriodEnd;
  if (event.pendingPlan !== undefined) patch.pending_plan = event.pendingPlan;
  if (event.pendingPriceId !== undefined) patch.pending_price_id = event.pendingPriceId;
  if (event.periodStart) patch.current_period_start = event.periodStart;
  if (event.periodEnd) patch.current_period_end = event.periodEnd;
  must(
    await db.from("subscriptions").update(patch).eq("id", sub.id).select("id").single(),
    "atualizar assinatura",
  );
  if (event.plan && event.plan !== sub.plan) {
    await setBusinessStatus(db, sub.business_id, { plan: event.plan });
    await dropAddonsNotIn(db, sub.business_id, event.plan);
  }
  return sub.business_id;
}

async function subscriptionCanceled(
  db: Db,
  event: Extract<BillingEvent, { type: "subscription.canceled" }>,
): Promise<string> {
  const sub = await subscriptionByProviderId(db, event.providerSubscriptionId);
  const now = new Date().toISOString();
  must(
    await db
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: now,
        cancel_at_period_end: false,
        pending_plan: null,
        pending_price_id: null,
        updated_at: now,
      })
      .eq("id", sub.id)
      .select("id")
      .single(),
    "cancelar assinatura",
  );
  await db
    .from("business_addons")
    .update({ removed_at: now })
    .eq("business_id", sub.business_id)
    .is("removed_at", null);
  await recomputeAddons(db, sub.business_id);
  await setBusinessStatus(db, sub.business_id, { plan_status: "canceled" });
  return sub.business_id;
}
