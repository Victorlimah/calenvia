import { describe, expect, it } from "vitest";
import { customerStatsLine, isFrequentNoShow, parseCustomerSort } from "./summary";

const base = {
  id: "1",
  name: "Ana",
  whatsapp: "5585999990000",
  visits: 3,
  no_shows: 1,
  upcoming: 0,
  total_spent_cents: 12000,
  last_visit_at: "2026-10-12T13:00:00Z",
  opted_out_at: null,
};

describe("resumo do cliente", () => {
  it("monta a linha com visitas, faltas, última visita e total", () => {
    expect(customerStatsLine(base, "America/Fortaleza")).toBe(
      "3 visitas · 1 falta · última em 12/10/2026 · R$ 120,00",
    );
  });

  it("cliente novo: só 0 visitas", () => {
    expect(
      customerStatsLine(
        { ...base, visits: 0, no_shows: 0, total_spent_cents: 0, last_visit_at: null },
        "America/Fortaleza",
      ),
    ).toBe("0 visitas");
  });

  it("singular", () => {
    expect(customerStatsLine({ ...base, visits: 1, no_shows: 2 }, "America/Fortaleza")).toMatch(
      /^1 visita · 2 faltas/,
    );
  });

  it("ordenação padrão e inválida", () => {
    expect(parseCustomerSort(undefined)).toBe("recentes");
    expect(parseCustomerSort("x")).toBe("recentes");
    expect(parseCustomerSort("faltas")).toBe("faltas");
  });

  it("marca quem falta muito", () => {
    expect(isFrequentNoShow({ visits: 1, no_shows: 2 })).toBe(true);
    expect(isFrequentNoShow({ visits: 5, no_shows: 2 })).toBe(false);
    expect(isFrequentNoShow({ visits: 0, no_shows: 1 })).toBe(false);
  });
});
