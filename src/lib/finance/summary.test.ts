import { describe, expect, it } from "vitest";
import { summarizeMonth, type FinanceEntry } from "./summary";

const e = (o: Partial<FinanceEntry>): FinanceEntry => ({
  id: Math.random().toString(),
  kind: "expense",
  amount_cents: 1000,
  category: "Produtos",
  description: null,
  occurred_on: "2026-11-05",
  ...o,
});

describe("resumo financeiro do mês", () => {
  it("saldo = atendimentos + outras receitas − despesas", () => {
    const s = summarizeMonth(50000, [
      e({ amount_cents: 120000, category: "Aluguel" }),
      e({ amount_cents: 8000 }),
      e({ amount_cents: 2000 }),
      e({ kind: "income", amount_cents: 15000, category: "Venda de produto" }),
    ]);
    expect(s).toMatchObject({
      appointmentsCents: 50000,
      otherIncomeCents: 15000,
      expensesCents: 130000,
      balanceCents: -65000,
    });
    expect(s.expensesByCategory).toEqual([
      { category: "Aluguel", cents: 120000 },
      { category: "Produtos", cents: 10000 },
    ]);
  });

  it("mês sem lançamentos", () => {
    expect(summarizeMonth(0, [])).toMatchObject({ balanceCents: 0, expensesByCategory: [] });
  });
});
