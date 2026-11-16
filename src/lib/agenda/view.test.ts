import { describe, expect, it } from "vitest";
import {
  addMonths,
  agendaHref,
  monthGrid,
  monthLabel,
  parseView,
  shiftDate,
  visibleRange,
  weekDaysOf,
  weekLabel,
  weekStartOf,
} from "./view";

describe("navegação da agenda (CAL-120)", () => {
  it("anterior/próximo anda conforme a visão", () => {
    expect(shiftDate("2026-11-16", "lista", 1)).toBe("2026-11-17");
    expect(shiftDate("2026-11-16", "dia", -1)).toBe("2026-11-15");
    expect(shiftDate("2026-11-16", "semana", 1)).toBe("2026-11-23");
    expect(shiftDate("2026-11-16", "semana", -1)).toBe("2026-11-09");
    expect(shiftDate("2026-11-16", "mes", 1)).toBe("2026-12-16");
    expect(shiftDate("2026-12-16", "mes", 1)).toBe("2027-01-16");
    expect(shiftDate("2026-01-10", "mes", -1)).toBe("2025-12-10");
  });

  it("mês curto não pula mês", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("links preservam a visão e o profissional", () => {
    const s = { date: "2026-11-16", view: "semana" as const, staffId: "abc" };
    expect(agendaHref(s)).toBe("/agenda?data=2026-11-16&visao=semana&profissional=abc");
    expect(agendaHref(s, { date: "2026-11-23" })).toBe(
      "/agenda?data=2026-11-23&visao=semana&profissional=abc",
    );
    expect(agendaHref(s, { staffId: null })).toBe("/agenda?data=2026-11-16&visao=semana");
    expect(agendaHref(s, { view: "mes" })).toContain("visao=mes");
  });

  it("aceita só visões conhecidas", () => {
    expect(parseView("semana")).toBe("semana");
    expect(parseView("mes")).toBe("mes");
    expect(parseView("ano")).toBeNull();
    expect(parseView(undefined)).toBeNull();
  });

  it("semana começa na segunda", () => {
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16"); // segunda
    expect(weekStartOf("2026-11-22")).toBe("2026-11-16"); // domingo
    expect(weekDaysOf("2026-11-18")).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
  });

  it("título da semana mostra o intervalo", () => {
    expect(weekLabel("2026-11-18")).toBe("16 a 22 de nov");
    expect(weekLabel("2026-10-29")).toBe("26 de out a 1 de nov");
    expect(weekLabel("2025-12-31")).toBe("29 de dez de 2025 a 4 de jan de 2026");
    expect(monthLabel("2026-11-18")).toBe("novembro de 2026");
  });
});

describe("grade do mês (CAL-121)", () => {
  it("novembro de 2026: 6 semanas de segunda a domingo", () => {
    const grid = monthGrid("2026-11-18");
    // 1/11/2026 é domingo: a primeira semana começa em 26/10.
    expect(grid[0][0]).toEqual({ date: "2026-10-26", inMonth: false });
    expect(grid[0][6]).toEqual({ date: "2026-11-01", inMonth: true });
    expect(grid).toHaveLength(6);
    expect(grid[5][0].date).toBe("2026-11-30");
    expect(grid[5][6]).toEqual({ date: "2026-12-06", inMonth: false });
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("fevereiro de 2027 começando na segunda cabe em 4 semanas", () => {
    const grid = monthGrid("2027-02-10");
    expect(grid).toHaveLength(4);
    expect(grid[0][0].date).toBe("2027-02-01");
    expect(grid[3][6].date).toBe("2027-02-28");
  });

  it("todas as semanas têm 7 dias seguidos", () => {
    for (const d of ["2026-01-15", "2026-06-01", "2026-12-31"]) {
      const cells = monthGrid(d).flat();
      expect(cells.length % 7).toBe(0);
      for (let i = 1; i < cells.length; i++) {
        expect(new Date(cells[i].date).getTime() - new Date(cells[i - 1].date).getTime()).toBe(
          86400000,
        );
      }
    }
  });

  it("intervalo visível por visão", () => {
    expect(visibleRange("2026-11-18", "lista")).toEqual({ from: "2026-11-18", to: "2026-11-18" });
    expect(visibleRange("2026-11-18", "semana")).toEqual({
      from: "2026-11-16",
      to: "2026-11-22",
    });
    expect(visibleRange("2026-11-18", "mes")).toEqual({ from: "2026-10-26", to: "2026-12-06" });
  });
});
