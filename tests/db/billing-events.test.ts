import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

// CAL-076 (fase 2): eventos normalizados aplicados no banco, com o pagamento simulado.
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

async function business() {
  const { data } = await db
    .from("businesses")
    .select("plan, plan_status, addon_messages, addon_members")
    .eq("id", businessId)
    .single();
  return data!;
}

async function subscription() {
  const { data } = await db
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data!;
}

async function startCheckout(plan: "pro" | "basic", withMessages: number) {
  const { data: prices } = await db.rpc("current_prices");
  const planPrice = prices!.find((p) => p.plan === plan)!;
  const msgs = prices!.find((p) => p.addon_code === "extra_messages_100")!;
  const addons = withMessages
    ? [{ addonId: msgs.addon_id, priceId: msgs.price_id, quantity: withMessages }]
    : [];
  const { data } = await db
    .from("checkout_sessions")
    .insert({
      business_id: businessId,
      provider: "mock",
      plan,
      price_id: planPrice.price_id,
      addons,
      amount_cents: planPrice.amount_cents + withMessages * msgs.amount_cents,
    })
    .select("id")
    .single();
  return data!.id;
}

beforeAll(async () => {
  const { data: user } = await db.auth.admin.createUser({
    email: `cobranca+${Date.now()}@teste.dev`,
    password: "senhaforte123",
    email_confirm: true,
  });
  ownerId = user.user!.id;
  const slug = `cobranca-${Date.now()}`;
  const { data: b, error } = await db
    .from("businesses")
    .insert({ owner_id: ownerId, slug, name: "Cobrança Teste", plan: "pro" })
    .select("id, plan_status")
    .single();
  if (error) throw error;
  businessId = b!.id;
  expect(b!.plan_status).toBe("pending");
});

afterAll(async () => {
  await db.from("businesses").delete().eq("id", businessId);
  await db.auth.admin.deleteUser(ownerId);
});

describe("eventos de cobrança (CAL-076)", () => {
  it("aprovar o pagamento simulado ativa o negócio, cria assinatura, extras e fatura", async () => {
    const { approveMockCheckout } = await import("@/lib/billing/mock");
    const sessionId = await startCheckout("pro", 2);
    const result = await approveMockCheckout(sessionId);
    expect(result.status).toBe("applied");

    expect(await business()).toMatchObject({
      plan: "pro",
      plan_status: "active",
      addon_messages: 200,
      addon_members: 0,
    });
    const sub = await subscription();
    expect(sub).toMatchObject({ status: "active", provider: "mock", plan: "pro" });
    expect(sub.provider_subscription_id).toMatch(/^mock_sub_/);

    const { data: invoices } = await db
      .from("invoices")
      .select("amount_cents, status, lines")
      .eq("business_id", businessId);
    expect(invoices).toHaveLength(1);
    expect(invoices![0]).toMatchObject({ amount_cents: 4490 + 2000, status: "paid" });

    const { data: session } = await db
      .from("checkout_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();
    expect(session!.status).toBe("completed");

    // Aprovar de novo não duplica nada.
    expect((await approveMockCheckout(sessionId)).status).toBe("duplicate");
    const { count } = await db
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    expect(count).toBe(1);
  });

  it("o mesmo evento aplicado duas vezes só vale uma vez", async () => {
    const { applyBillingEvent } = await import("@/lib/billing/events");
    const sub = await subscription();
    const event = {
      id: `test_evt_${randomUUID()}`,
      provider: "mock" as const,
      occurredAt: new Date().toISOString(),
      businessId,
      type: "invoice.payment_failed" as const,
      providerSubscriptionId: sub.provider_subscription_id!,
      invoice: {
        providerInvoiceId: `test_in_${randomUUID()}`,
        amountCents: 6490,
        periodStart: null,
        periodEnd: null,
        hostedUrl: null,
        lines: [],
      },
    };
    expect((await applyBillingEvent(event)).status).toBe("applied");
    expect((await business()).plan_status).toBe("past_due");
    const since = (await subscription()).past_due_since;
    expect(since).not.toBeNull();

    expect((await applyBillingEvent(event)).status).toBe("duplicate");
    const { count } = await db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("provider_event_id", event.id);
    expect(count).toBe(1);
  });

  it("pagar a fatura em atraso volta para ativo", async () => {
    const { simulateInvoicePayment } = await import("@/lib/billing/mock");
    expect((await simulateInvoicePayment(await subscription())).status).toBe("applied");
    expect((await business()).plan_status).toBe("active");
    expect((await subscription()).past_due_since).toBeNull();
    const { data } = await db
      .from("invoices")
      .select("status")
      .eq("business_id", businessId)
      .eq("status", "failed");
    expect(data).toHaveLength(0);
  });

  it("evento de assinatura desconhecida fica registrado com erro", async () => {
    const { applyBillingEvent } = await import("@/lib/billing/events");
    const id = `test_evt_${randomUUID()}`;
    const result = await applyBillingEvent({
      id,
      provider: "mock",
      occurredAt: new Date().toISOString(),
      businessId: null,
      type: "subscription.canceled",
      providerSubscriptionId: "nao-existe",
    });
    expect(result.status).toBe("error");
    const { data } = await db
      .from("billing_events")
      .select("processed_at, error")
      .eq("provider_event_id", id)
      .single();
    expect(data!.processed_at).toBeNull();
    expect(data!.error).toMatch(/assinatura/);
    await db.from("billing_events").delete().eq("provider_event_id", id);
  });

  it("cancelada: status cancelado e extras removidos", async () => {
    const { applyBillingEvent } = await import("@/lib/billing/events");
    const sub = await subscription();
    const result = await applyBillingEvent({
      id: `test_evt_${randomUUID()}`,
      provider: "mock",
      occurredAt: new Date().toISOString(),
      businessId,
      type: "subscription.canceled",
      providerSubscriptionId: sub.provider_subscription_id!,
    });
    expect(result.status).toBe("applied");
    expect(await business()).toMatchObject({ plan_status: "canceled", addon_messages: 0 });
    expect((await subscription()).status).toBe("canceled");
  });

  it("voltar a assinar depois de cancelar cria uma assinatura nova", async () => {
    const { approveMockCheckout } = await import("@/lib/billing/mock");
    const sessionId = await startCheckout("basic", 0);
    expect((await approveMockCheckout(sessionId)).status).toBe("applied");
    expect(await business()).toMatchObject({ plan: "basic", plan_status: "active" });
    const { count } = await db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    expect(count).toBe(2);
  });
});
