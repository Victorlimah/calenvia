import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

// CAL-115 (fase 5): preços versionados, extras do catálogo, combinados e cortesia.
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
let addonId: string;
let originalProPrice: string;

async function biz() {
  const { data } = await db
    .from("businesses")
    .select("plan, plan_status, addon_messages, addon_members")
    .eq("id", businessId)
    .single();
  return data!;
}

beforeAll(async () => {
  const { data: user } = await db.auth.admin.createUser({
    email: `catalogo+${Date.now()}@teste.dev`,
    password: "senhaforte123",
    email_confirm: true,
  });
  ownerId = user.user!.id;
  const { data: b } = await db
    .from("businesses")
    .insert({ owner_id: ownerId, slug: `catalogo-${Date.now()}`, name: "Catálogo", plan: "basic" })
    .select("id")
    .single();
  businessId = b!.id;
  const { data: p } = await db
    .from("billing_prices")
    .select("id")
    .eq("plan", "pro")
    .eq("is_current", true)
    .single();
  originalProPrice = p!.id;
});

afterAll(async () => {
  await db.from("businesses").delete().eq("id", businessId);
  await db.auth.admin.deleteUser(ownerId);
  // Devolve o preço do Pro e apaga o que o teste criou.
  await db.from("billing_prices").update({ is_current: false }).eq("plan", "pro");
  await db.from("billing_prices").update({ is_current: true }).eq("id", originalProPrice);
  await db
    .from("billing_prices")
    .delete()
    .eq("plan", "pro")
    .neq("id", originalProPrice)
    .is("provider_price_id", null);
  if (addonId) {
    await db.from("billing_prices").delete().eq("addon_id", addonId);
    await db.from("billing_addons").delete().eq("id", addonId);
  }
});

describe("cortesia e extras (CAL-115)", () => {
  it("cortesia ativa o negócio com assinatura manual", async () => {
    const { activateCourtesy } = await import("@/lib/billing/catalog");
    expect((await activateCourtesy(businessId)).ok).toBe(true);
    expect((await biz()).plan_status).toBe("active");
    const { data: sub } = await db
      .from("subscriptions")
      .select("provider, status")
      .eq("business_id", businessId)
      .single();
    expect(sub).toEqual({ provider: "manual", status: "active" });
  });

  it("extra do catálogo soma no limite; o plano precisa aceitar", async () => {
    const { addCatalogAddon } = await import("@/lib/billing/catalog");
    const { data: addons } = await db.from("billing_addons").select("id, code");
    const member = addons!.find((a) => a.code === "extra_member_1")!.id;
    const messages = addons!.find((a) => a.code === "extra_messages_100")!.id;

    const r = await addCatalogAddon(businessId, member, 2, "parceria", ownerId);
    expect(r.ok).toBe(true);
    expect((await biz()).addon_members).toBe(2);
    // De novo: soma na mesma linha.
    await addCatalogAddon(businessId, member, 1, null, ownerId);
    expect((await biz()).addon_members).toBe(3);

    // Básico não aceita o pacote de mensagens.
    const denied = await addCatalogAddon(businessId, messages, 1, null, ownerId);
    expect(denied.ok).toBe(false);
  });

  it("combinado não muda limite; quantidade 0 remove", async () => {
    const { addCustomAddon, setBusinessAddonQuantity } = await import("@/lib/billing/catalog");
    expect((await addCustomAddon(businessId, "Treinamento", 2500, null, ownerId)).ok).toBe(true);
    const { loadSubscriptionItems } = await import("@/lib/billing/items");
    const { items, totalCents } = await loadSubscriptionItems(db as never, businessId);
    expect(items.map((i) => i.description)).toEqual([
      "Plano Básico",
      "+1 pessoa na equipe",
      "Treinamento",
    ]);
    expect(totalCents).toBe(2990 + 3 * 500 + 2500);

    const member = items.find((i) => i.kind === "addon")!;
    await setBusinessAddonQuantity(member.id!, 0);
    expect((await biz()).addon_members).toBe(0);
  });
});

describe("preços versionados (CAL-115)", () => {
  it("mudar preço: quem já assina fica com o antigo, a não ser que peça para aplicar", async () => {
    const { changePrice } = await import("@/lib/billing/catalog");
    // Assinante do Pro com o preço atual.
    const { data: s } = await db
      .from("subscriptions")
      .update({ plan: "pro", price_id: originalProPrice })
      .eq("business_id", businessId)
      .select("id")
      .single();

    const r1 = await changePrice({ product: "plan", plan: "pro" }, 4990, {
      applyToExisting: false,
      adminUserId: ownerId,
    });
    expect(r1.ok).toBe(true);
    const { data: still } = await db
      .from("subscriptions")
      .select("price_id")
      .eq("id", s!.id)
      .single();
    expect(still!.price_id).toBe(originalProPrice);

    const { data: current } = await db.rpc("current_prices");
    expect(current!.find((p) => p.plan === "pro")!.amount_cents).toBe(4990);

    // Valor igual ao atual é recusado.
    const same = await changePrice({ product: "plan", plan: "pro" }, 4990, {
      applyToExisting: false,
      adminUserId: ownerId,
    });
    expect(same.ok).toBe(false);
  });

  it("aplicar a quem já assina move só quem estava no preço anterior", async () => {
    const { changePrice } = await import("@/lib/billing/catalog");
    const { data: before } = await db
      .from("billing_prices")
      .select("id")
      .eq("plan", "pro")
      .eq("is_current", true)
      .single();
    await db.from("subscriptions").update({ price_id: before!.id }).eq("business_id", businessId);
    const r = await changePrice({ product: "plan", plan: "pro" }, 5490, {
      applyToExisting: true,
      adminUserId: ownerId,
    });
    expect(r.ok && r.data!.moved).toBe(1);
    const { data: sub } = await db
      .from("subscriptions")
      .select("price_id")
      .eq("business_id", businessId)
      .single();
    expect(sub!.price_id).toBe(r.ok ? r.data!.priceId : null);
  });

  it("criar e arquivar extra", async () => {
    const { createAddon, setAddonActive } = await import("@/lib/billing/catalog");
    const r = await createAddon(
      {
        code: `extra_teste_${Date.now()}`,
        name: "+500 mensagens/mês",
        description: "",
        kind: "messages",
        unitAmount: 500,
        plans: ["pro_plus"],
        amountCents: 4000,
      },
      ownerId,
    );
    expect(r.ok).toBe(true);
    addonId = r.ok ? r.data!.addonId : "";
    let { data } = await db.rpc("current_prices");
    expect(data!.some((p) => p.addon_id === addonId)).toBe(true);

    await setAddonActive(addonId, false);
    ({ data } = await db.rpc("current_prices"));
    expect(data!.some((p) => p.addon_id === addonId)).toBe(false);
  });
});
