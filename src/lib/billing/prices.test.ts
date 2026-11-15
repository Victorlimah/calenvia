import { describe, expect, it } from "vitest";
import {
  addonsForPlan,
  checkoutItems,
  fallbackPrices,
  pricesFromRows,
  subscriptionTotal,
  type CurrentPriceRow,
} from "./prices";

const rows: CurrentPriceRow[] = [
  { price_id: "p-basic", product: "plan", plan: "basic", amount_cents: 2990 } as CurrentPriceRow,
  { price_id: "p-pro", product: "plan", plan: "pro", amount_cents: 4990 } as CurrentPriceRow,
  {
    price_id: "p-msg",
    product: "addon",
    plan: null,
    addon_id: "a-msg",
    addon_code: "extra_messages_100",
    addon_name: "+100 mensagens/mês",
    addon_description: "",
    addon_kind: "messages",
    addon_unit_amount: 100,
    addon_plans: ["pro", "pro_plus"],
    addon_sort_order: 10,
    amount_cents: 1000,
  },
  {
    price_id: "p-mem",
    product: "addon",
    plan: null,
    addon_id: "a-mem",
    addon_code: "extra_member_1",
    addon_name: "+1 pessoa na equipe",
    addon_description: "",
    addon_kind: "members",
    addon_unit_amount: 1,
    addon_plans: ["basic", "pro"],
    addon_sort_order: 20,
    amount_cents: 500,
  },
];

describe("preços (CAL-076)", () => {
  it("lê do banco e completa com plans.ts o que faltar", () => {
    const p = pricesFromRows(rows);
    expect(p.plans.pro).toEqual({ plan: "pro", priceId: "p-pro", amountCents: 4990 });
    expect(p.plans.pro_plus).toEqual({ plan: "pro_plus", priceId: null, amountCents: 7490 });
    expect(p.addons.map((a) => a.code)).toEqual(["extra_messages_100", "extra_member_1"]);
  });

  it("fallback sem banco: preços de plans.ts e nenhum extra", () => {
    const p = fallbackPrices();
    expect(p.plans.basic.amountCents).toBe(2990);
    expect(p.addons).toEqual([]);
  });

  it("extras por plano: pessoa extra não aparece no Pro+", () => {
    const { addons } = pricesFromRows(rows);
    expect(addonsForPlan(addons, "pro_plus").map((a) => a.code)).toEqual(["extra_messages_100"]);
    expect(addonsForPlan(addons, "basic").map((a) => a.code)).toEqual(["extra_member_1"]);
  });

  it("total do mês", () => {
    expect(subscriptionTotal([])).toBe(0);
    expect(
      subscriptionTotal([
        { quantity: 1, amountCents: 4490 },
        { quantity: 2, amountCents: 1000 },
      ]),
    ).toBe(6490);
  });

  it("checkout: plano + extras aceitos; ignora extra de outro plano, quantidade 0 e desconhecido", () => {
    const prices = pricesFromRows(rows);
    const r = checkoutItems(prices, "pro", [
      { addonId: "a-msg", quantity: 2 },
      { addonId: "a-mem", quantity: 0 },
      { addonId: "nao-existe", quantity: 1 },
    ]);
    expect(r.totalCents).toBe(4990 + 2 * 1000);
    expect(r.lines).toEqual([
      { description: "Plano Pro", quantity: 1, amountCents: 4990 },
      { description: "+100 mensagens/mês", quantity: 2, amountCents: 1000 },
    ]);
    const basic = checkoutItems(prices, "basic", [{ addonId: "a-msg", quantity: 1 }]);
    expect(basic.addons).toEqual([]);
    expect(basic.totalCents).toBe(2990);
  });

  it("checkout junta o mesmo extra repetido", () => {
    const r = checkoutItems(pricesFromRows(rows), "pro", [
      { addonId: "a-msg", quantity: 1 },
      { addonId: "a-msg", quantity: 2 },
    ]);
    expect(r.addons).toHaveLength(1);
    expect(r.addons[0].quantity).toBe(3);
  });
});
