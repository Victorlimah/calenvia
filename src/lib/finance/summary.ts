/** Controle financeiro simples (CAL-102): resumo do mês. Função pura. */
export const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Produtos",
  "Comissão",
  "Contas (luz, água, internet)",
  "Equipamentos",
  "Marketing",
  "Impostos",
  "Outros",
] as const;

export const INCOME_CATEGORIES = ["Venda de produto", "Serviço avulso", "Outros"] as const;

export type FinanceEntry = {
  id: string;
  kind: "income" | "expense";
  amount_cents: number;
  category: string;
  description: string | null;
  occurred_on: string;
};

export type FinanceSummary = {
  appointmentsCents: number;
  otherIncomeCents: number;
  expensesCents: number;
  balanceCents: number;
  expensesByCategory: { category: string; cents: number }[];
};

export function summarizeMonth(appointmentsCents: number, entries: FinanceEntry[]): FinanceSummary {
  const sum = (kind: FinanceEntry["kind"]) =>
    entries.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount_cents, 0);
  const otherIncomeCents = sum("income");
  const expensesCents = sum("expense");
  const byCat = new Map<string, number>();
  for (const e of entries.filter((x) => x.kind === "expense"))
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount_cents);
  return {
    appointmentsCents,
    otherIncomeCents,
    expensesCents,
    balanceCents: appointmentsCents + otherIncomeCents - expensesCents,
    expensesByCategory: [...byCat.entries()]
      .map(([category, cents]) => ({ category, cents }))
      .sort((a, b) => b.cents - a.cents),
  };
}
