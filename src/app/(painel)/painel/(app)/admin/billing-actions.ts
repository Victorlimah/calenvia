"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { getPlatformAdmin, type PlatformAdmin } from "@/lib/admin/auth";
import { isMockBilling } from "@/lib/billing/config";
import { currentSubscription } from "@/lib/billing/lifecycle";
import {
  simulateInvoicePayment,
  simulatePaymentFailure,
  simulateRenewal,
} from "@/lib/billing/mock";
import { reportError } from "@/lib/monitoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOT_ADMIN = "Você não tem acesso à administração.";
const UUID = /^[0-9a-f-]{36}$/i;

/** Grava no histórico da administração uma ação de cobrança (texto livre em `detail`). */
export async function auditBilling(
  admin: PlatformAdmin,
  businessId: string | null,
  action: string,
  detail: string,
) {
  const { error } = await createSupabaseAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_user_id: admin.userId,
      admin_email: admin.email,
      business_id: businessId,
      action,
      changes: { detail: { from: null, to: detail } },
    });
  if (error) await reportError(error, { source: "action", path: "admin.audit", extra: { action } });
}

const SIMULATIONS = {
  renewal: { run: simulateRenewal, label: "Simulou a renovação do ciclo" },
  failure: { run: simulatePaymentFailure, label: "Simulou falha de pagamento" },
  payment: { run: simulateInvoicePayment, label: "Simulou o pagamento da fatura" },
} as const;

export type BillingSimulation = keyof typeof SIMULATIONS;

/** Botões de simulação do /admin (só com BILLING_PROVIDER=mock). */
export async function simulateBillingAction(
  businessId: string,
  kind: BillingSimulation,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!isMockBilling())
    return { ok: false, error: "Simulação só existe com o pagamento simulado." };
  if (!UUID.test(businessId) || !(kind in SIMULATIONS)) {
    return { ok: false, error: "Pedido inválido." };
  }
  const sub = await currentSubscription(businessId);
  if (!sub) return { ok: false, error: "Este negócio não tem assinatura aberta." };
  if (sub.provider === "stripe")
    return { ok: false, error: "Assinatura no Stripe: não simulável." };
  const sim = SIMULATIONS[kind];
  const result = await sim.run(sub);
  if (result.status === "error") return { ok: false, error: result.error };
  await auditBilling(admin, businessId, `billing.simulate_${kind}`, sim.label);
  revalidatePath(`/admin/negocios/${businessId}`);
  return { ok: true, message: `${sim.label}.` };
}
