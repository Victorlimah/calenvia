import "server-only";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { openSubscription, recomputeAddons, type SubscriptionRow } from "./events";
import { invalidatePricesCache } from "./prices-server";
import { getBillingProvider, providerForSubscription } from "./provider";

type Db = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Administração de preços e extras (CAL-115). Preço nunca é editado: mudar o valor cria uma
 * versão nova (igual ao `Price` imutável do Stripe). Quem já assina mantém o preço antigo, a não
 * ser que o admin peça "aplicar também a quem já assina" (vale a partir do próximo ciclo).
 */
export type CatalogResult<T = undefined> =
  { ok: true; message: string; data?: T } | { ok: false; error: string };

export type PriceTarget = { product: "plan"; plan: PlanId } | { product: "addon"; addonId: string };

/** Depois de mudar o catálogo: Stripe precisa dos produtos/preços novos (fase 6). */
async function afterCatalogChange() {
  invalidatePricesCache();
  const provider = await getBillingProvider();
  if (provider.id === "stripe") {
    const { syncCatalogToStripe } = await import("./stripe-sync");
    await syncCatalogToStripe();
  }
}

/** Sincroniza os itens da assinatura do negócio no gateway (cobrança proporcional). */
export async function syncBusinessSubscription(db: Db, businessId: string) {
  const sub = await openSubscription(db, businessId);
  if (!sub || sub.provider === "manual") return;
  await (await providerForSubscription(sub)).syncItems(sub);
}

export async function changePrice(
  target: PriceTarget,
  amountCents: number,
  opts: { applyToExisting: boolean; adminUserId: string },
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult<{ priceId: string; moved: number }>> {
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 10_000_00) {
    return { ok: false, error: "Valor inválido." };
  }
  let q = db.from("billing_prices").select("id, amount_cents").eq("is_current", true);
  q = target.product === "plan" ? q.eq("plan", target.plan) : q.eq("addon_id", target.addonId);
  const { data: old } = await q.maybeSingle();
  if (old && old.amount_cents === amountCents) {
    return { ok: false, error: "O valor é igual ao preço atual." };
  }

  if (old) await db.from("billing_prices").update({ is_current: false }).eq("id", old.id);
  const { data: created, error } = await db
    .from("billing_prices")
    .insert({
      product: target.product,
      plan: target.product === "plan" ? target.plan : null,
      addon_id: target.product === "addon" ? target.addonId : null,
      amount_cents: amountCents,
      created_by: opts.adminUserId,
    })
    .select("id")
    .single();
  if (error || !created) {
    // Volta o preço antigo como atual.
    if (old) await db.from("billing_prices").update({ is_current: true }).eq("id", old.id);
    return { ok: false, error: "Não foi possível salvar o preço." };
  }

  await afterCatalogChange();

  let moved = 0;
  if (opts.applyToExisting && old) {
    if (target.product === "plan") {
      const { data } = await db
        .from("subscriptions")
        .update({ price_id: created.id })
        .eq("price_id", old.id)
        .neq("status", "canceled")
        .select("business_id");
      moved = data?.length ?? 0;
      await db
        .from("subscriptions")
        .update({ pending_price_id: created.id })
        .eq("pending_price_id", old.id)
        .neq("status", "canceled");
      for (const row of data ?? []) await syncQuietly(db, row.business_id);
    } else {
      const { data } = await db
        .from("business_addons")
        .update({ price_id: created.id })
        .eq("price_id", old.id)
        .is("removed_at", null)
        .select("business_id");
      const businesses = [...new Set((data ?? []).map((r) => r.business_id))];
      moved = businesses.length;
      for (const id of businesses) await syncQuietly(db, id);
    }
  }
  return {
    ok: true,
    message: opts.applyToExisting
      ? `Preço novo salvo e aplicado a ${moved} ${moved === 1 ? "assinante" : "assinantes"} a partir do próximo ciclo.`
      : "Preço novo salvo. Quem já assina continua com o preço antigo.",
    data: { priceId: created.id, moved },
  };
}

async function syncQuietly(db: Db, businessId: string) {
  try {
    await syncBusinessSubscription(db, businessId);
  } catch (e) {
    console.error("[billing] sincronizar assinatura", businessId, e);
  }
}

export type NewAddon = {
  code: string;
  name: string;
  description: string;
  kind: "messages" | "members";
  unitAmount: number;
  plans: PlanId[];
  amountCents: number;
};

export async function createAddon(
  input: NewAddon,
  adminUserId: string,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult<{ addonId: string }>> {
  const plans = input.plans.filter((p) => PLAN_ORDER.includes(p));
  if (plans.length === 0) return { ok: false, error: "Escolha ao menos um plano." };
  const { data: max } = await db
    .from("billing_addons")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: addon, error } = await db
    .from("billing_addons")
    .insert({
      code: input.code,
      name: input.name,
      description: input.description,
      kind: input.kind,
      unit_amount: input.unitAmount,
      plans,
      sort_order: Math.min((max?.sort_order ?? 0) + 10, 80),
    })
    .select("id")
    .single();
  if (error || !addon) {
    return {
      ok: false,
      error:
        error?.code === "23505" ? "Já existe um extra com esse código." : "Não foi possível criar.",
    };
  }
  const { error: priceError } = await db.from("billing_prices").insert({
    product: "addon",
    addon_id: addon.id,
    amount_cents: input.amountCents,
    created_by: adminUserId,
  });
  if (priceError) {
    await db.from("billing_addons").delete().eq("id", addon.id);
    return { ok: false, error: "Não foi possível salvar o preço do extra." };
  }
  await afterCatalogChange();
  return { ok: true, message: "Extra criado.", data: { addonId: addon.id } };
}

/** Arquivar: some do catálogo; quem já tem continua pagando até ser removido. */
export async function setAddonActive(
  addonId: string,
  active: boolean,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult> {
  const { error } = await db
    .from("billing_addons")
    .update({ is_active: active })
    .eq("id", addonId)
    .neq("kind", "custom");
  if (error) return { ok: false, error: "Não foi possível salvar." };
  invalidatePricesCache();
  return { ok: true, message: active ? "Extra de volta ao catálogo." : "Extra arquivado." };
}

// ---------------------------------------------------------------------------
// Extras de um negócio
// ---------------------------------------------------------------------------

async function finishBusinessChange(db: Db, businessId: string): Promise<string | null> {
  await recomputeAddons(db, businessId);
  try {
    await syncBusinessSubscription(db, businessId);
    return null;
  } catch (e) {
    console.error("[billing] syncItems", businessId, e);
    return " Atenção: não foi possível atualizar a cobrança no gateway; tente de novo.";
  }
}

export async function addCatalogAddon(
  businessId: string,
  addonId: string,
  quantity: number,
  note: string | null,
  adminUserId: string,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult> {
  const [{ data: business }, { data: price }] = await Promise.all([
    db.from("businesses").select("plan").eq("id", businessId).maybeSingle(),
    db
      .from("billing_prices")
      .select("id, billing_addons!inner(plans, kind, is_active, name)")
      .eq("addon_id", addonId)
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  if (!business || !price) return { ok: false, error: "Extra ou negócio não encontrado." };
  const addon = price.billing_addons as { plans: string[]; kind: string; name: string };
  if (!addon.plans.includes(business.plan)) {
    return {
      ok: false,
      error: `O plano ${PLANS[business.plan as PlanId]?.name ?? business.plan} não aceita este extra.`,
    };
  }
  const { data: existing } = await db
    .from("business_addons")
    .select("id, quantity")
    .eq("business_id", businessId)
    .eq("addon_id", addonId)
    .is("removed_at", null)
    .eq("is_custom", false)
    .maybeSingle();
  if (existing) {
    await db
      .from("business_addons")
      .update({ quantity: existing.quantity + quantity, note })
      .eq("id", existing.id);
  } else {
    const { error } = await db.from("business_addons").insert({
      business_id: businessId,
      addon_id: addonId,
      price_id: price.id,
      quantity,
      note,
      created_by: adminUserId,
    });
    if (error) return { ok: false, error: "Não foi possível adicionar o extra." };
  }
  const warn = await finishBusinessChange(db, businessId);
  return { ok: true, message: `${addon.name} × ${quantity} adicionado.${warn ?? ""}` };
}

export async function addCustomAddon(
  businessId: string,
  label: string,
  amountCents: number,
  note: string | null,
  adminUserId: string,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult> {
  const { data: custom } = await db
    .from("billing_addons")
    .select("id")
    .eq("code", "custom")
    .single();
  if (!custom) return { ok: false, error: "Extra combinado não configurado." };
  const { error } = await db.from("business_addons").insert({
    business_id: businessId,
    addon_id: custom.id,
    is_custom: true,
    custom_label: label,
    custom_amount_cents: amountCents,
    note,
    created_by: adminUserId,
  });
  if (error) return { ok: false, error: "Não foi possível adicionar." };
  const warn = await finishBusinessChange(db, businessId);
  return { ok: true, message: `“${label}” adicionado.${warn ?? ""}` };
}

export async function setBusinessAddonQuantity(
  businessAddonId: string,
  quantity: number,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult<{ businessId: string }>> {
  const { data: row } = await db
    .from("business_addons")
    .select("business_id")
    .eq("id", businessAddonId)
    .is("removed_at", null)
    .maybeSingle();
  if (!row) return { ok: false, error: "Extra não encontrado." };
  if (quantity <= 0) {
    await db
      .from("business_addons")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", businessAddonId);
  } else {
    await db.from("business_addons").update({ quantity }).eq("id", businessAddonId);
  }
  const warn = await finishBusinessChange(db, row.business_id);
  return {
    ok: true,
    message: `${quantity <= 0 ? "Extra removido." : "Quantidade atualizada."}${warn ?? ""}`,
    data: { businessId: row.business_id },
  };
}

/**
 * "Ativar sem cobrança (cortesia)": assinatura `manual` ativa, para conta de teste ou parceria.
 * Não mexe em quem já tem assinatura paga aberta.
 */
export async function activateCourtesy(
  businessId: string,
  db: Db = createSupabaseAdminClient(),
): Promise<CatalogResult> {
  const { data: business } = await db
    .from("businesses")
    .select("plan, plan_status")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return { ok: false, error: "Negócio não encontrado." };
  const sub: SubscriptionRow | null = await openSubscription(db, businessId);
  if (sub && sub.provider !== "manual") {
    return { ok: false, error: "Este negócio já tem assinatura paga. Cancele-a antes." };
  }
  const { data: price } = await db
    .from("billing_prices")
    .select("id")
    .eq("product", "plan")
    .eq("plan", business.plan)
    .eq("is_current", true)
    .maybeSingle();
  const now = new Date().toISOString();
  if (sub) {
    await db
      .from("subscriptions")
      .update({
        status: "active",
        past_due_since: null,
        cancel_at_period_end: false,
        updated_at: now,
      })
      .eq("id", sub.id);
  } else {
    const { error } = await db.from("subscriptions").insert({
      business_id: businessId,
      plan: business.plan,
      status: "active",
      provider: "manual",
      price_id: price?.id ?? null,
      current_period_start: now,
    });
    if (error) return { ok: false, error: "Não foi possível criar a assinatura." };
  }
  await db.from("businesses").update({ plan_status: "active" }).eq("id", businessId);
  return { ok: true, message: "Assinatura ativada sem cobrança (cortesia)." };
}
