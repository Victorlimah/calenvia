import { describe, expect, it } from "vitest";
import { parsePeriod, shiftPeriod } from "./period";

const TODAY = "2026-11-18";

describe("período do Financeiro (CAL-126)", () => {
  it("padrão é o mês atual", () => {
    expect(parsePeriod({}, TODAY)).toMatchObject({
      kind: "mes",
      range: { from: "2026-11-01", to: "2026-11-30" },
      label: "novembro de 2026",
    });
  });

  it("dia e semana a partir da data", () => {
    expect(parsePeriod({ periodo: "dia", data: "2026-11-10" }, TODAY).range).toEqual({
      from: "2026-11-10",
      to: "2026-11-10",
    });
    expect(parsePeriod({ periodo: "semana" }, TODAY)).toMatchObject({
      range: { from: "2026-11-16", to: "2026-11-22" },
      label: "16 a 22 de nov",
    });
  });

  it("personalizado: ordena as datas e limita a um ano", () => {
    expect(
      parsePeriod({ periodo: "personalizado", de: "2026-11-15", ate: "2026-11-01" }, TODAY),
    ).toMatchObject({ range: { from: "2026-11-01", to: "2026-11-15" }, label: "1/11 a 15/11" });
    const long = parsePeriod(
      { periodo: "personalizado", de: "2020-01-01", ate: "2026-11-18" },
      TODAY,
    );
    expect(long.range).toEqual({ from: "2025-11-18", to: "2026-11-18" });
    // sem datas válidas cai no mês
    expect(parsePeriod({ periodo: "personalizado", de: "x" }, TODAY).kind).toBe("mes");
  });

  it("anterior/seguinte", () => {
    expect(shiftPeriod(parsePeriod({ periodo: "dia" }, TODAY), -1)).toBe("2026-11-17");
    expect(shiftPeriod(parsePeriod({ periodo: "semana" }, TODAY), 1)).toBe("2026-11-25");
    expect(shiftPeriod(parsePeriod({}, TODAY), -1)).toBe("2026-10-18");
  });
});
