import { describe, expect, it } from "vitest";
import { buildMonthlyReport, monthRange, shiftMonth, type ReportAppointment } from "./monthly";

const TZ = "America/Fortaleza";
const a = (o: Partial<ReportAppointment>): ReportAppointment => ({
  starts_at: "2026-11-10T13:00:00Z", // terça 10:00
  status: "completed",
  price_cents: 4000,
  service: "Corte",
  staff: "Zé",
  customer_id: "c1",
  customer_name: "Ana",
  ...o,
});

describe("relatório do mês", () => {
  const list = [
    a({}),
    a({ customer_id: "c2", customer_name: "Bia", price_cents: 6000, service: "Combo" }),
    a({ status: "no_show", customer_id: "c3", customer_name: "Caio" }),
    a({ status: "canceled" }),
    a({ status: "confirmed", starts_at: "2026-11-28T22:00:00Z", staff: "Rafa" }), // sáb 19:00
  ];
  const r = buildMonthlyReport(list, TZ, new Date("2026-11-20T12:00:00Z"));

  it("faturamento, previsto, perdido e ticket médio", () => {
    expect(r).toMatchObject({
      total: 4,
      completed: 2,
      noShows: 1,
      canceled: 1,
      upcoming: 1,
      revenueCents: 10000,
      expectedCents: 14000,
      lostCents: 4000,
      averageTicketCents: 5000,
    });
  });

  it("taxa de faltas sobre quem deveria ter vindo", () => {
    expect(r.noShowRate).toBeCloseTo(1 / 3);
  });

  it("quebras por serviço (maior faturamento primeiro), dia e período", () => {
    expect(r.byService[0]).toEqual({ label: "Combo", count: 1, revenueCents: 6000 });
    expect(r.byWeekday.map((w) => w.label)).toEqual(["Terça", "Sábado"]);
    expect(r.byPeriod.map((p) => p.label)).toEqual(["Manhã", "Noite"]);
    expect(r.byStaff.find((s) => s.label === "Rafa")?.count).toBe(1);
  });

  it("melhores clientes pelo valor", () => {
    expect(r.topCustomers.map((c) => c.name)).toEqual(["Bia", "Ana"]);
  });

  it("mês vazio não divide por zero", () => {
    expect(buildMonthlyReport([], TZ)).toMatchObject({ noShowRate: 0, averageTicketCents: 0 });
  });

  it("navegação de meses", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" });
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 1)).toBe("2026-12");
  });
});
