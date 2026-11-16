import { describe, expect, it } from "vitest";
import {
  comeBackMessage,
  customerAverageGap,
  gaps,
  groupVisits,
  missingCustomers,
  newVsReturning,
  overallAverageGap,
  ranking,
  returnRate,
  type VisitRecord,
} from "./customers";

const v = (customerId: string, day: string, p: Partial<VisitRecord> = {}): VisitRecord => ({
  customerId,
  name: customerId.toUpperCase(),
  whatsapp: `55859${customerId.padEnd(8, "0")}`,
  day,
  status: "completed",
  priceCents: 4000,
  ...p,
});

describe("retorno dos clientes (CAL-124)", () => {
  const customers = groupVisits([
    v("ana", "2026-09-01"),
    v("ana", "2026-09-21"),
    v("ana", "2026-10-11"), // a cada 20 dias
    v("ana", "2026-10-11"), // duas no mesmo dia contam como uma
    v("bia", "2026-10-01"), // uma visita só
    v("caio", "2026-08-01"),
    v("caio", "2026-08-31"),
    v("caio", "2026-09-15", { status: "no_show" }), // falta não conta
    v("caio", "2026-09-20", { status: "canceled" }), // cancelado não conta
    v("avulso", "2026-10-01", { whatsapp: "5500000000000" }), // cliente avulso fora
  ]);

  it("agrupa visitas concluídas por cliente, sem repetir o dia, sem avulso", () => {
    expect(customers.map((c) => c.id).sort()).toEqual(["ana", "bia", "caio"]);
    const ana = customers.find((c) => c.id === "ana")!;
    expect(ana.days).toEqual(["2026-09-01", "2026-09-21", "2026-10-11"]);
    expect(ana.visits).toHaveLength(4);
    expect(gaps(ana.days)).toEqual([20, 20]);
  });

  it("tempo médio entre visitas: por cliente e geral", () => {
    const ana = customers.find((c) => c.id === "ana")!;
    const bia = customers.find((c) => c.id === "bia")!;
    expect(customerAverageGap(ana)).toBe(20);
    expect(customerAverageGap(bia)).toBeNull();
    // intervalos: ana 20, 20; caio 30 → média 23,3
    expect(overallAverageGap(customers)).toBeCloseTo(70 / 3);
    expect(overallAverageGap([])).toBeNull();
  });

  it("sumidos: passaram do tempo médio deles; 1 visita só não entra", () => {
    const missing = missingCustomers(customers, "2026-11-16");
    expect(missing.map((m) => m.id)).toEqual(["caio", "ana"]);
    expect(missing[0]).toMatchObject({ lastVisit: "2026-08-31", averageGap: 30, daysSince: 77 });
    expect(missing[1]).toMatchObject({ averageGap: 20, daysSince: 36, overdueBy: 16 });
    // dentro do prazo: ninguém sumido
    expect(missingCustomers(customers, "2026-10-20").map((m) => m.id)).toEqual(["caio"]);
  });

  it("taxa de retorno em 30/60/90 dias", () => {
    // em 30 dias: ana voltou (20), caio voltou (30), bia não → 2/3
    expect(returnRate(customers, 30, "2026-11-16")).toEqual({
      rate: 2 / 3,
      eligible: 3,
      returned: 2,
    });
    // ninguém com 1ª visita há 90+ dias além de caio (08/01) → 1/1
    expect(returnRate(customers, 90, "2026-11-16")).toMatchObject({ eligible: 1, returned: 1 });
    expect(returnRate([], 30, "2026-11-16").rate).toBeNull();
  });

  it("novos x que voltaram no período", () => {
    expect(newVsReturning(customers, { from: "2026-10-01", to: "2026-10-31" })).toEqual({
      new: 1, // bia
      returning: 1, // ana
    });
  });

  it("mensagem para chamar de volta usa o primeiro nome", () => {
    expect(comeBackMessage("Lucas Andrade", "Barbearia do Zé")).toContain("Olá, Lucas!");
  });
});

describe("ranking de clientes (CAL-125)", () => {
  const customers = groupVisits([
    v("ana", "2026-01-10", { priceCents: 3000 }),
    v("ana", "2026-11-01", { priceCents: 3000 }),
    v("ana", "2026-11-10", { priceCents: 3000 }),
    v("bia", "2026-11-05", { priceCents: 20000 }),
    v("caio", "2025-06-01", { priceCents: 50000 }),
    v("avulso", "2026-11-05", { whatsapp: "5500000000000", priceCents: 99999 }),
  ]);

  it("mais frequentes e que mais gastam, por período", () => {
    expect(ranking(customers, "visits", null).map((r) => [r.id, r.visits])).toEqual([
      ["ana", 3],
      ["caio", 1],
      ["bia", 1],
    ]);
    expect(ranking(customers, "spent", null).map((r) => r.id)).toEqual(["caio", "bia", "ana"]);
    expect(ranking(customers, "spent", "2026-10-18").map((r) => [r.id, r.spentCents])).toEqual([
      ["bia", 20000],
      ["ana", 6000],
    ]);
    expect(ranking(customers, "visits", "2026-01-01", 1)).toHaveLength(1);
  });

  it("sem permissão de valores, gasto vem nulo", () => {
    const hidden = groupVisits([v("ana", "2026-11-01", { priceCents: null })]);
    expect(ranking(hidden, "spent", null)[0].spentCents).toBeNull();
  });
});
