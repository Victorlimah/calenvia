"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { isMockBilling } from "@/lib/billing/config";
import { approveMockCheckout } from "@/lib/billing/mock";
import { checkoutItems } from "@/lib/billing/prices";
import { getCurrentPrices } from "@/lib/billing/prices-server";
import { getBillingProvider, providerForSubscription } from "@/lib/billing/provider";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  currentSubscription,
  resumeSubscription,
} from "@/lib/billing/lifecycle";
import { memberWith, NO_PERMISSION } from "@/lib/business/current";
import { appUrl } from "@/lib/hosts";
import { needsCheckout, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const checkoutSchema = z.object({
  plan: z.enum(PLAN_ORDER as [PlanId, ...PlanId[]], { message: "Escolha um plano." }),
  addons: z
    .array(z.object({ addonId: z.uuid(), quantity: z.number().int().min(0).max(50) }))
    .max(20)
    .default([]),
});

/** Cria a sessão de pagamento e devolve a URL para onde mandar o dono. */
export async function startCheckoutAction(
  input: z.input<typeof checkoutSchema>,
): Promise<ActionResult<{ url: string }>> {
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escolha um plano válido." };
  const business = member.business;
  if (!needsCheckout(business)) {
    return { ok: false, error: "Sua assinatura já está ativa. Para mudar, use a tela Assinatura." };
  }

  const prices = await getCurrentPrices({ fresh: true });
  const { planPrice, addons, totalCents } = checkoutItems(
    prices,
    parsed.data.plan,
    parsed.data.addons,
  );
  if (!planPrice.priceId) {
    return { ok: false, error: "Não foi possível carregar os preços. Tente de novo em instantes." };
  }

  const provider = await getBillingProvider();
  const db = createSupabaseAdminClient();
  const desiredAddons = addons.map((a) => ({
    addonId: a.addon.addonId,
    priceId: a.addon.priceId,
    quantity: a.quantity,
  }));
  // Sessões abertas anteriores deixam de valer.
  await db
    .from("checkout_sessions")
    .update({ status: "expired" })
    .eq("business_id", business.id)
    .eq("status", "open");
  const { data: session, error } = await db
    .from("checkout_sessions")
    .insert({
      business_id: business.id,
      provider: provider.id,
      plan: parsed.data.plan,
      price_id: planPrice.priceId,
      addons: desiredAddons,
      amount_cents: totalCents,
      created_by: member.userId,
    })
    .select("id")
    .single();
  if (error || !session) return { ok: false, error: "Não foi possível iniciar o pagamento." };

  const user = await requireUser();
  try {
    const result = await provider.createCheckout({
      businessId: business.id,
      checkoutSessionId: session.id,
      items: { plan: parsed.data.plan, priceId: planPrice.priceId, addons: desiredAddons },
      customerEmail: user.email ?? null,
      successUrl: appUrl("/assinatura?ativado=1"),
      cancelUrl: appUrl("/assinatura/checkout"),
    });
    await db
      .from("checkout_sessions")
      .update({ provider_session_id: result.providerSessionId })
      .eq("id", session.id);
    return { ok: true, data: { url: result.url } };
  } catch (e) {
    console.error("[billing] checkout", e);
    return { ok: false, error: "Não foi possível abrir o pagamento. Tente de novo." };
  }
}

/** Botão "Aprovar pagamento" do pagamento simulado (só com BILLING_PROVIDER=mock). */
export async function approveMockPaymentAction(
  sessionId: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  if (!isMockBilling()) return { ok: false, error: "Pagamento simulado desligado." };
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  if (!z.uuid().safeParse(sessionId).success) return { ok: false, error: "Pagamento inválido." };
  const db = createSupabaseAdminClient();
  const { data: session } = await db
    .from("checkout_sessions")
    .select("business_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.business_id !== member.business.id) {
    return { ok: false, error: "Pagamento não encontrado." };
  }
  const result = await approveMockCheckout(sessionId);
  if (result.status === "error") return { ok: false, error: result.error };
  return { ok: true, data: { redirectTo: "/assinatura?ativado=1" } };
}

const planSchema = z.enum(PLAN_ORDER as [PlanId, ...PlanId[]]);

/** Trocar de plano: upgrade na hora (proporcional), downgrade no fim do ciclo (CAL-078). */
export async function changePlanAction(plan: string): Promise<ActionResult> {
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return { ok: false, error: "Escolha um plano válido." };
  const r = await changeSubscriptionPlan(member.business.id, parsed.data);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: r.message };
}

/** Cancelar no fim do período pago. */
export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  const r = await cancelSubscription(member.business.id);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: r.message };
}

/** Desfazer o cancelamento agendado. */
export async function resumeSubscriptionAction(): Promise<ActionResult> {
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  const r = await resumeSubscription(member.business.id);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  return { ok: true, message: r.message };
}

/** "Atualizar cartão": abre o portal do gateway (no mock não existe). */
export async function customerPortalAction(): Promise<ActionResult<{ url: string }>> {
  const member = await memberWith("billing.manage");
  if (!member) return { ok: false, error: NO_PERMISSION };
  const sub = await currentSubscription(member.business.id);
  if (!sub || sub.provider !== "stripe") {
    return {
      ok: false,
      error: isMockBilling()
        ? "Pagamento simulado: não há cartão para atualizar."
        : "Sua assinatura não usa cartão. Fale com a Calenvia.",
    };
  }
  const provider = await providerForSubscription(sub);
  const url = await provider.customerPortalUrl(sub, appUrl("/assinatura"));
  if (!url) return { ok: false, error: "Não foi possível abrir o portal. Tente de novo." };
  return { ok: true, data: { url } };
}
