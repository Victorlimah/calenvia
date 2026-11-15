import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

// CAL-077 / CAL-078 (fase 3): troca de plano, cancelamento e cron diário, com o pagamento simulado.
process.env.NEXT_PUBLIC_ROOT_DOMAIN ??= "localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let ownerId: string;
let businessId: string;
const DAY = 24 * 60 * 60 * 1000;

async function business() {
  const { data } = await db
    .from("businesses")
    .select("plan, plan_status, addon_members")
    .eq("id", businessId)
    .single();
  return data!;
}

async function sub() {
  const { data } = await db
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .neq("status", "canceled")
    .maybeSingle();
  return data;
}

/** Faz o ciclo atual ter terminado (para o cron agir). */
async function endCycle() {
  const s = (await sub())!;
  await db
    .from("subscriptions")
    .update({
      current_period_start: new Date(Date.now() - 31 * DAY).toISOString(),
      current_period_end: new Date(Date.now() - 1000).toISOString(),
    })
    .eq("id", s.id);
}

beforeAll(async () => {
  const { data: user } = await db.auth.admin.createUser({
    email: `ciclo+${Date.now()}@teste.dev`,
    password: "senhaforte123",
    email_confirm: true,
  });
  ownerId = user.user!.id;
  const { data: b } = await db
    .from("businesses")
    .insert({ owner_id: ownerId, slug: `ciclo-${Date.now()}`, name: "Ciclo", plan: "pro" })
    .select("id")
    .single();
  businessId = b!.id;

  // Assina o Pro com 2 pessoas extras.
  const { data: prices } = await db.rpc("current_prices");
  const pro = prices!.find((p) => p.plan === "pro")!;
  const member = prices!.find((p) => p.addon_code === "extra_member_1")!;
  const { data: session } = await db
    .from("checkout_sessions")
    .insert({
      business_id: businessId,
      provider: "mock",
      plan: "pro",
      price_id: pro.price_id,
      addons: [{ addonId: member.addon_id, priceId: member.price_id, quantity: 2 }],
      amount_cents: pro.amount_cents + 2 * member.amount_cents,
    })
    .select("id")
    .single();
  const { approveMockCheckout } = await import("@/lib/billing/mock");
  expect((await approveMockCheckout(session!.id)).status).toBe("applied");
  expect(await business()).toMatchObject({ plan: "pro", plan_status: "active", addon_members: 2 });
});

afterAll(async () => {
  await db.from("businesses").delete().eq("id", businessId);
  await db.auth.admin.deleteUser(ownerId);
});

describe("ciclo de vida da assinatura (CAL-077, CAL-078)", () => {
  it("upgrade vale na hora, cobra proporcional e tira extra que o plano não aceita", async () => {
    const { changeSubscriptionPlan } = await import("@/lib/billing/lifecycle");
    const r = await changeSubscriptionPlan(businessId, "pro_plus");
    expect(r.ok).toBe(true);
    expect(await business()).toMatchObject({ plan: "pro_plus", addon_members: 0 });
    expect((await sub())!.plan).toBe("pro_plus");
    const { data: inv } = await db
      .from("invoices")
      .select("amount_cents, lines")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(JSON.stringify(inv!.lines)).toMatch(/proporcional/);
    expect(inv!.amount_cents).toBeGreaterThan(0);
  });

  it("downgrade fica agendado; escolher o plano atual desfaz", async () => {
    const { changeSubscriptionPlan } = await import("@/lib/billing/lifecycle");
    expect((await changeSubscriptionPlan(businessId, "basic")).ok).toBe(true);
    expect((await business()).plan).toBe("pro_plus");
    expect((await sub())!.pending_plan).toBe("basic");
    expect((await changeSubscriptionPlan(businessId, "pro_plus")).ok).toBe(true);
    expect((await sub())!.pending_plan).toBeNull();
  });

  it("cron aplica o downgrade quando o ciclo termina", async () => {
    const { changeSubscriptionPlan, runBillingCron } = await import("@/lib/billing/lifecycle");
    await changeSubscriptionPlan(businessId, "pro");
    await endCycle();
    const summary = await runBillingCron();
    expect(summary.downgraded).toBeGreaterThanOrEqual(1);
    expect((await business()).plan).toBe("pro");
    expect((await sub())!.pending_plan).toBeNull();
  });

  it("renovação simulada com downgrade agendado já vem no plano novo", async () => {
    const { changeSubscriptionPlan } = await import("@/lib/billing/lifecycle");
    const { simulateRenewal } = await import("@/lib/billing/mock");
    await changeSubscriptionPlan(businessId, "basic");
    expect((await simulateRenewal((await sub())!)).status).toBe("applied");
    expect((await business()).plan).toBe("basic");
    const { data: inv } = await db
      .from("invoices")
      .select("amount_cents")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(inv!.amount_cents).toBe(2990);
    // Volta para o Pro para os próximos testes.
    await changeSubscriptionPlan(businessId, "pro");
  });

  it("falha de pagamento: atraso, e o cron suspende só depois da carência", async () => {
    const { runBillingCron } = await import("@/lib/billing/lifecycle");
    const { simulatePaymentFailure, simulateInvoicePayment } = await import("@/lib/billing/mock");
    await simulatePaymentFailure((await sub())!);
    expect((await business()).plan_status).toBe("past_due");

    await runBillingCron();
    expect((await business()).plan_status).toBe("past_due");

    await runBillingCron(new Date(Date.now() + 8 * DAY));
    expect((await business()).plan_status).toBe("suspended");
    expect((await sub())!.status).toBe("suspended");

    await simulateInvoicePayment((await sub())!);
    expect((await business()).plan_status).toBe("active");
    expect((await sub())!.status).toBe("active");
  });

  it("cancelar agenda para o fim do período; reativar desfaz; o cron cancela no fim", async () => {
    const { cancelSubscription, resumeSubscription, runBillingCron } =
      await import("@/lib/billing/lifecycle");
    expect((await cancelSubscription(businessId)).ok).toBe(true);
    expect((await sub())!.cancel_at_period_end).toBe(true);
    expect((await business()).plan_status).toBe("active");

    expect((await resumeSubscription(businessId)).ok).toBe(true);
    expect((await sub())!.cancel_at_period_end).toBe(false);

    await cancelSubscription(businessId);
    await endCycle();
    const summary = await runBillingCron();
    expect(summary.canceled).toBeGreaterThanOrEqual(1);
    expect((await business()).plan_status).toBe("canceled");
    expect(await sub()).toBeNull();
  });
});
