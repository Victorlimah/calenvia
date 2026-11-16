import { describe, expect, it } from "vitest";
import {
  autoGranularity,
  availableMinutes,
  breakdown,
  cashSummary,
  change,
  occupancy,
  paymentBreakdown,
  previousRange,
  rangeOf,
  revenueSeries,
  totals,
  type StatRow,
} from "./stats";

function row(p: Partial<StatRow>): StatRow {
  return {
    day: "2026-11-10",
    serviceId: "corte",
    staffId: "ze",
    status: "completed",
    source: "link",
    paymentMethod: null,
    appointments: 1,
    revenueCents: 4000,
    minutes: 30,
    ...p,
  };
}

const NOV = { from: "2026-11-01", to: "2026-11-30" };

describe("totais do período (CAL-123)", () => {
  const rows = [
    row({ appointments: 3, revenueCents: 12000, minutes: 90 }),
    row({ status: "no_show", revenueCents: 4000 }),
    row({ status: "confirmed", day: "2026-11-20", revenueCents: 5000, appointments: 1 }),
    row({ status: "canceled", revenueCents: 4000 }),
    row({ day: "2026-10-31", revenueCents: 9999 }), // fora do período
  ];

  it("soma só concluídos no faturamento e ignora cancelados", () => {
    const t = totals(rows, NOV);
    expect(t.appointments).toBe(5);
    expect(t.completed).toBe(3);
    expect(t.noShows).toBe(1);
    expect(t.canceled).toBe(1);
    expect(t.upcoming).toBe(1);
    expect(t.revenueCents).toBe(12000);
    expect(t.expectedCents).toBe(17000);
    expect(t.noShowRate).toBeCloseTo(0.25);
    expect(t.averageTicketCents).toBe(4000);
    expect(t.bookedMinutes).toBe(150);
  });

  it("sem permissão de valores, R$ vem nulo", () => {
    const t = totals([row({ revenueCents: null })], NOV);
    expect(t.revenueCents).toBeNull();
    expect(t.averageTicketCents).toBeNull();
    expect(t.completed).toBe(1);
  });

  it("período vazio", () => {
    const t = totals([], NOV);
    expect(t.appointments).toBe(0);
    expect(t.noShowRate).toBeNull();
    expect(t.revenueCents).toBe(0);
  });

  it("comparação com o período anterior", () => {
    expect(change(150, 100)).toBeCloseTo(0.5);
    expect(change(50, 100)).toBeCloseTo(-0.5);
    expect(change(10, 0)).toBeNull();
    expect(change(null, 10)).toBeNull();
  });

  it("intervalos de dia, semana (segunda) e mês, e o anterior", () => {
    expect(rangeOf("2026-11-18", "day")).toEqual({ from: "2026-11-18", to: "2026-11-18" });
    expect(rangeOf("2026-11-18", "week")).toEqual({ from: "2026-11-16", to: "2026-11-22" });
    expect(rangeOf("2026-02-10", "month")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange(rangeOf("2026-03-10", "month"), "month")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(previousRange(rangeOf("2026-11-18", "week"), "week")).toEqual({
      from: "2026-11-09",
      to: "2026-11-15",
    });
    expect(previousRange({ from: "2026-11-18", to: "2026-11-18" }, "day")).toEqual({
      from: "2026-11-17",
      to: "2026-11-17",
    });
  });
});

describe("faturamento por período (CAL-126)", () => {
  it("barras por dia, com dias vazios e entradas manuais", () => {
    const series = revenueSeries(
      [
        row({ day: "2026-11-02", revenueCents: 4000 }),
        row({ day: "2026-11-02", status: "no_show" }),
      ],
      [
        { day: "2026-11-03", kind: "income", category: "Venda", amountCents: 1500 },
        { day: "2026-11-03", kind: "expense", category: "Aluguel", amountCents: 90000 },
      ],
      { from: "2026-11-01", to: "2026-11-04" },
      "day",
    );
    expect(series.map((b) => [b.key, b.revenueCents])).toEqual([
      ["2026-11-01", 0],
      ["2026-11-02", 4000],
      ["2026-11-03", 1500],
      ["2026-11-04", 0],
    ]);
    expect(series[1].label).toBe("2/11");
  });

  it("barras por semana e por mês", () => {
    const rows = [
      row({ day: "2026-11-02" }),
      row({ day: "2026-11-10" }),
      row({ day: "2026-12-01" }),
    ];
    const weeks = revenueSeries(rows, [], { from: "2026-11-01", to: "2026-11-15" }, "week");
    expect(weeks.map((b) => [b.key, b.revenueCents])).toEqual([
      ["2026-10-26", 0],
      ["2026-11-02", 4000],
      ["2026-11-09", 4000],
    ]);
    const months = revenueSeries(rows, [], { from: "2026-11-01", to: "2026-12-31" }, "month");
    expect(months.map((b) => [b.key, b.revenueCents, b.label])).toEqual([
      ["2026-11", 8000, "nov/26"],
      ["2026-12", 4000, "dez/26"],
    ]);
    expect(autoGranularity({ from: "2026-11-01", to: "2026-11-30" })).toBe("day");
    expect(autoGranularity({ from: "2026-01-01", to: "2026-03-31" })).toBe("week");
    expect(autoGranularity({ from: "2026-01-01", to: "2026-12-31" })).toBe("month");
  });

  it("por serviço e por profissional, só concluídos", () => {
    const rows = [
      row({ serviceId: "corte", revenueCents: 8000, appointments: 2 }),
      row({ serviceId: "barba", revenueCents: 3000 }),
      row({ serviceId: "barba", status: "no_show" }),
    ];
    expect(breakdown(rows, NOV, "service", { corte: "Corte", barba: "Barba" })).toEqual([
      { id: "corte", label: "Corte", appointments: 2, revenueCents: 8000 },
      { id: "barba", label: "Barba", appointments: 1, revenueCents: 3000 },
    ]);
    expect(breakdown(rows, NOV, "staff", {})[0].label).toBe("Removido");
  });

  it("os números batem entre totais, série e caixa (mesmas fontes)", () => {
    const rows = [
      row({ day: "2026-11-02", revenueCents: 4000 }),
      row({ day: "2026-11-15", revenueCents: 6000, source: "manual" }), // registrar atendimento
      row({ day: "2026-11-15", status: "confirmed", revenueCents: 7000 }),
    ];
    const entries = [
      { day: "2026-11-20", kind: "income" as const, category: "Venda", amountCents: 500 },
    ];
    const t = totals(rows, NOV);
    const series = revenueSeries(rows, entries, NOV, "day");
    const cash = cashSummary(rows, entries, NOV);
    const seriesTotal = series.reduce((s, b) => s + b.revenueCents, 0);
    expect(t.revenueCents).toBe(10000);
    expect(cash.appointmentsCents).toBe(t.revenueCents);
    expect(seriesTotal).toBe(cash.incomeCents);
  });
});

describe("caixa e forma de pagamento (CAL-127/128)", () => {
  it("resumo com despesas e saldo", () => {
    const cash = cashSummary(
      [row({ revenueCents: 10000 })],
      [
        { day: "2026-11-05", kind: "income", category: "Venda", amountCents: 2000 },
        { day: "2026-11-05", kind: "expense", category: "Aluguel", amountCents: 5000 },
        { day: "2026-12-01", kind: "expense", category: "Aluguel", amountCents: 5000 },
      ],
      NOV,
    );
    expect(cash).toEqual({
      appointmentsCents: 10000,
      otherIncomeCents: 2000,
      incomeCents: 12000,
      expensesCents: 5000,
      balanceCents: 7000,
    });
  });

  it("caixa por forma de pagamento, com 'não informado'", () => {
    const rows = [
      row({ paymentMethod: "pix", revenueCents: 4000 }),
      row({ paymentMethod: "cash", revenueCents: 3000 }),
      row({ paymentMethod: "pix", revenueCents: 5000 }),
      row({ paymentMethod: null, revenueCents: 1000 }),
      row({ paymentMethod: "card", status: "no_show" }),
    ];
    expect(paymentBreakdown(rows, NOV)).toEqual([
      { method: "cash", label: "Dinheiro", appointments: 1, revenueCents: 3000 },
      { method: "pix", label: "Pix", appointments: 2, revenueCents: 9000 },
      { method: null, label: "Não informado", appointments: 1, revenueCents: 1000 },
    ]);
  });
});

describe("ocupação (CAL-123)", () => {
  const hours = [
    { weekday: 2, is_open: true, opens_at: "09:00", closes_at: "18:00" },
    { weekday: 3, is_open: true, opens_at: "09:00", closes_at: "18:00" },
  ];
  const breaks = [{ weekday: 2, starts_at: "12:00", ends_at: "13:00" }];

  it("soma o horário de cada profissional menos o almoço", () => {
    // terça 17/11 e quarta 18/11: (9h - 1h) + 9h = 17h por profissional
    const range = { from: "2026-11-16", to: "2026-11-18" };
    expect(availableMinutes(range, { hours, breaks }, [{ id: "a" }, { id: "b" }])).toBe(
      17 * 60 * 2,
    );
    // horário próprio: só quarta, 4h
    const own = [{ weekday: 3, is_open: true, opens_at: "14:00", closes_at: "18:00" }];
    expect(availableMinutes(range, { hours, breaks }, [{ id: "a", hours: own }])).toBe(240);
  });

  it("taxa de ocupação limitada a 100%", () => {
    expect(occupancy(120, 480)).toBeCloseTo(0.25);
    expect(occupancy(600, 480)).toBe(1);
    expect(occupancy(10, 0)).toBeNull();
  });
});
