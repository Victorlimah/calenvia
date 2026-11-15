import { describe, expect, it } from "vitest";
import {
  estimatedMrrCents,
  formatRate,
  funnelRates,
  parseFunnelPeriod,
  planTotal,
} from "./metrics";

describe("estimatedMrrCents (CAL-114)", () => {
  it("soma o preço de tabela das assinaturas ativas e separa as atrasadas", () => {
    const r = estimatedMrrCents({
      basic: { active: 2, pending: 5 },
      pro: { active: 1, past_due: 2 },
      pro_plus: { active: 1, suspended: 3 },
    });
    expect(r.activeCents).toBe(2 * 2990 + 4490 + 7490);
    expect(r.activeBusinesses).toBe(4);
    expect(r.atRiskCents).toBe(2 * 4490);
    expect(r.atRiskBusinesses).toBe(2);
  });

  it("sem negócios dá zero e ignora plano desconhecido", () => {
    expect(estimatedMrrCents({})).toEqual({
      activeCents: 0,
      activeBusinesses: 0,
      atRiskCents: 0,
      atRiskBusinesses: 0,
    });
    expect(estimatedMrrCents({ gold: { active: 9 } }).activeCents).toBe(0);
  });
});

describe("funnelRates", () => {
  it("taxa sobre o anterior e sobre o primeiro", () => {
    const r = funnelRates([
      { step: "a", total: 100 },
      { step: "b", total: 40 },
      { step: "c", total: 10 },
    ]);
    expect(r[0]).toMatchObject({ fromPrevious: null, fromFirst: 1 });
    expect(r[1]).toMatchObject({ fromPrevious: 0.4, fromFirst: 0.4 });
    expect(r[2]).toMatchObject({ fromPrevious: 0.25, fromFirst: 0.1 });
  });

  it("não divide por zero", () => {
    const r = funnelRates([
      { step: "a", total: 0 },
      { step: "b", total: 0 },
      { step: "c", total: 3 },
    ]);
    expect(r.map((s) => [s.fromPrevious, s.fromFirst])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(funnelRates([])).toEqual([]);
  });
});

describe("helpers", () => {
  it("formatRate", () => {
    expect(formatRate(0.426)).toBe("43%");
    expect(formatRate(null)).toBe("—");
  });
  it("parseFunnelPeriod aceita 7, 30 e 90; padrão 30", () => {
    expect(parseFunnelPeriod("7")).toBe(7);
    expect(parseFunnelPeriod("90")).toBe(90);
    expect(parseFunnelPeriod("15")).toBe(30);
    expect(parseFunnelPeriod(undefined)).toBe(30);
  });
  it("planTotal soma todos os status", () => {
    expect(planTotal({ pro: { active: 2, pending: 1 } }, "pro")).toBe(3);
    expect(planTotal({}, "basic")).toBe(0);
  });
});
