"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, invalid } from "@/lib/action-result";
import { getPlatformAdmin, type PlatformAdmin } from "@/lib/admin/auth";
import {
  activateCourtesy,
  addCatalogAddon,
  addCustomAddon,
  changePrice,
  createAddon,
  setAddonActive,
  setBusinessAddonQuantity,
} from "@/lib/billing/catalog";
import { isMockBilling } from "@/lib/billing/config";
import { currentSubscription } from "@/lib/billing/lifecycle";
import {
  simulateInvoicePayment,
  simulatePaymentFailure,
  simulateRenewal,
} from "@/lib/billing/mock";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { reportError } from "@/lib/monitoring";
import { PLANS } from "@/lib/plans";
import { slugify } from "@/lib/slug";
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

// ---------------------------------------------------------------------------
// Preços e extras (CAL-115, fase 5)
// ---------------------------------------------------------------------------

const priceInput = z.object({
  target: z.discriminatedUnion("product", [
    z.object({ product: z.literal("plan"), plan: z.enum(["basic", "pro", "pro_plus"]) }),
    z.object({ product: z.literal("addon"), addonId: z.uuid() }),
  ]),
  amount: z.string(),
  applyToExisting: z.boolean().default(false),
});

/** "Mudar preço": cria a versão nova do preço de um plano ou extra. */
export async function changePriceAction(input: z.input<typeof priceInput>): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  const parsed = priceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const cents = parsePriceToCents(parsed.data.amount);
  if (!cents) return { ok: false, error: "Informe um valor, ex.: 49,90." };
  const r = await changePrice(parsed.data.target, cents, {
    applyToExisting: parsed.data.applyToExisting,
    adminUserId: admin.userId,
  });
  if (!r.ok) return r;
  const what =
    parsed.data.target.product === "plan"
      ? `plano ${PLANS[parsed.data.target.plan].name}`
      : "extra";
  await auditBilling(
    admin,
    null,
    "billing.price_change",
    `Mudou o preço do ${what} para ${formatPrice(cents)}${parsed.data.applyToExisting ? " (aplicado a quem já assina)" : ""}`,
  );
  revalidatePath("/admin/precos");
  return { ok: true, message: r.message };
}

const addonInput = z.object({
  name: z.string().trim().min(2, "Dê um nome.").max(80),
  description: z.string().trim().max(300).default(""),
  kind: z.enum(["messages", "members"]),
  unitAmount: z.coerce.number().int().min(1, "Mínimo 1.").max(10000),
  plans: z.array(z.enum(["basic", "pro", "pro_plus"])).min(1, "Escolha ao menos um plano."),
  amount: z.string(),
});

export async function createAddonAction(input: z.input<typeof addonInput>): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  const parsed = addonInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const cents = parsePriceToCents(parsed.data.amount);
  if (!cents) return { ok: false, error: "Informe o valor por mês, ex.: 10,00." };
  const code = `extra_${slugify(parsed.data.name).replace(/-/g, "_")}`.slice(0, 60);
  const r = await createAddon({ ...parsed.data, code, amountCents: cents }, admin.userId);
  if (!r.ok) return r;
  await auditBilling(admin, null, "billing.addon_create", `Criou o extra “${parsed.data.name}”`);
  revalidatePath("/admin/precos");
  return { ok: true, message: r.message };
}

export async function setAddonActiveAction(
  addonId: string,
  active: boolean,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(addonId)) return { ok: false, error: "Pedido inválido." };
  const r = await setAddonActive(addonId, active);
  if (!r.ok) return r;
  await auditBilling(
    admin,
    null,
    active ? "billing.addon_restore" : "billing.addon_archive",
    active ? "Voltou um extra ao catálogo" : "Arquivou um extra",
  );
  revalidatePath("/admin/precos");
  return { ok: true, message: r.message };
}

const businessAddonInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("catalog"),
    addonId: z.uuid({ message: "Escolha o extra." }),
    quantity: z.coerce.number().int().min(1).max(100),
    note: z.string().trim().max(300).default(""),
  }),
  z.object({
    type: z.literal("custom"),
    label: z.string().trim().min(2, "Descreva o combinado.").max(80),
    amount: z.string(),
    note: z.string().trim().max(300).default(""),
  }),
]);

/** Seção "Extras" do negócio: do catálogo (com quantidade) ou combinado (valor livre). */
export async function addBusinessAddonAction(
  businessId: string,
  input: z.input<typeof businessAddonInput>,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(businessId)) return { ok: false, error: "Pedido inválido." };
  const parsed = businessAddonInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  let r;
  if (d.type === "catalog") {
    r = await addCatalogAddon(businessId, d.addonId, d.quantity, d.note || null, admin.userId);
  } else {
    const cents = parsePriceToCents(d.amount);
    if (!cents) return { ok: false, error: "Informe o valor por mês, ex.: 20,00." };
    r = await addCustomAddon(businessId, d.label, cents, d.note || null, admin.userId);
  }
  if (!r.ok) return r;
  await auditBilling(admin, businessId, "billing.addon_add", r.message.split(" Atenção")[0]);
  revalidatePath(`/admin/negocios/${businessId}`);
  return { ok: true, message: r.message };
}

export async function setBusinessAddonQuantityAction(
  businessAddonId: string,
  quantity: number,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (
    !UUID.test(businessAddonId) ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 100
  ) {
    return { ok: false, error: "Pedido inválido." };
  }
  const r = await setBusinessAddonQuantity(businessAddonId, quantity);
  if (!r.ok) return r;
  await auditBilling(
    admin,
    r.data!.businessId,
    "billing.addon_change",
    quantity === 0 ? "Removeu um extra" : `Mudou a quantidade de um extra para ${quantity}`,
  );
  revalidatePath(`/admin/negocios/${r.data!.businessId}`);
  return { ok: true, message: r.message };
}

export async function activateCourtesyAction(businessId: string): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(businessId)) return { ok: false, error: "Pedido inválido." };
  const r = await activateCourtesy(businessId);
  if (!r.ok) return r;
  await auditBilling(admin, businessId, "billing.courtesy", "Ativou sem cobrança (cortesia)");
  revalidatePath(`/admin/negocios/${businessId}`);
  return { ok: true, message: r.message };
}
