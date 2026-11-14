import { describe, expect, it } from "vitest";
import {
  findNextAvailableDay,
  getDaySlots,
  getDaysSummary,
  isSlotAvailable,
  overlaps,
} from "./engine";
import { MONDAY, TZ, at, makeContext, week } from "./fixtures";

const corte = { serviceId: "corte", durationMin: 30 };
const times = (ctx: ReturnType<typeof makeContext>, q: Parameters<typeof getDaySlots>[1]) =>
  getDaySlots(ctx, q).slots.map((s) => s.time);

describe("conflito", () => {
  it("encostar não é conflito; sobrepor é", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
    expect(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 })).toBe(true);
    expect(overlaps({ start: 12, end: 15 }, { start: 10, end: 20 })).toBe(true);
  });
});

describe("geração de horários", () => {
  it("gera a cada slot_interval_min dentro do horário, pulando o almoço", () => {
    const t = times(makeContext(), { ...corte, date: MONDAY, staffId: "ze" });
    expect(t[0]).toBe("09:00");
    expect(t).toContain("11:30");
    expect(t).not.toContain("12:00");
    expect(t).not.toContain("12:30");
    expect(t).toContain("13:00");
    expect(t.at(-1)).toBe("17:30");
    expect(t).toHaveLength(16);
  });

  it("intervalo de 15 e de 60 minutos", () => {
    expect(
      times(makeContext({ slotIntervalMin: 15 }), { ...corte, date: MONDAY, staffId: "ze" }),
    ).toHaveLength(30); // 9h–17h30 a cada 15 min, menos 11h45–12h45 (almoço)
    expect(
      times(makeContext({ slotIntervalMin: 60 }), { ...corte, date: MONDAY, staffId: "ze" }),
    ).toEqual(["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]);
  });

  it("os horários são instantes UTC corretos no fuso do negócio", () => {
    const day = getDaySlots(makeContext(), { ...corte, date: MONDAY, staffId: "ze" });
    expect(day.slots[0].start.toISOString()).toBe("2026-11-16T12:00:00.000Z");
    expect(day.slots[0].end.toISOString()).toBe("2026-11-16T12:30:00.000Z");
  });

  it("agrupa em Manhã, Tarde e Noite", () => {
    const ctx = makeContext({ businessHours: week("08:00", "21:00"), breaks: [] });
    const day = getDaySlots(ctx, { ...corte, date: MONDAY, staffId: "ze" });
    expect(day.groups.morning[0].time).toBe("08:00");
    expect(day.groups.morning.at(-1)!.time).toBe("11:30");
    expect(day.groups.afternoon[0].time).toBe("12:00");
    expect(day.groups.afternoon.at(-1)!.time).toBe("17:30");
    expect(day.groups.evening[0].time).toBe("18:00");
    expect(day.groups.evening.at(-1)!.time).toBe("20:30");
  });
});

describe("regras de dia", () => {
  it("dia fechado devolve lista vazia com motivo closed", () => {
    const day = getDaySlots(makeContext(), { ...corte, date: "2026-11-15", staffId: null });
    expect(day.status).toBe("closed");
    expect(day.slots).toEqual([]);
  });

  it("dia no passado", () => {
    const ctx = makeContext({ now: at(MONDAY, "08:00") });
    expect(getDaySlots(ctx, { ...corte, date: "2026-11-14", staffId: null }).status).toBe("past");
  });

  it("dias além de max_days_ahead", () => {
    const ctx = makeContext({ maxDaysAhead: 7 });
    expect(getDaySlots(ctx, { ...corte, date: "2026-11-22", staffId: null }).status).toBe("closed"); // domingo
    expect(getDaySlots(ctx, { ...corte, date: "2026-11-21", staffId: null }).status).toBe("open");
    expect(getDaySlots(ctx, { ...corte, date: "2026-11-23", staffId: null }).status).toBe(
      "too_far",
    );
  });

  it("profissional precisa fazer o serviço", () => {
    const day = getDaySlots(makeContext(), {
      serviceId: "barba",
      durationMin: 30,
      date: MONDAY,
      staffId: "ana",
    });
    expect(day.status).toBe("no_staff");
  });

  it("dia cheio vira full", () => {
    const ctx = makeContext({
      blocks: [{ staffId: null, start: at(MONDAY, "09:00"), end: at(MONDAY, "18:00") }],
    });
    expect(getDaySlots(ctx, { ...corte, date: MONDAY, staffId: null }).status).toBe("full");
  });
});

describe("resumo e próximo dia livre", () => {
  it("resume vários dias", () => {
    const s = getDaysSummary(makeContext(), { ...corte, staffId: null }, "2026-11-15", 3);
    expect(s.map((d) => d.status)).toEqual(["closed", "open", "open"]);
    expect(s[1].count).toBeGreaterThan(0);
  });

  it("acha o próximo dia livre", () => {
    const ctx = makeContext({
      blocks: [{ staffId: null, start: at(MONDAY, "00:00"), end: at("2026-11-17", "23:59") }],
    });
    expect(findNextAvailableDay(ctx, { ...corte, staffId: null }, "2026-11-15")).toBe("2026-11-18");
  });

  it("não acha nada além do limite", () => {
    const ctx = makeContext({ maxDaysAhead: 1, now: at("2026-11-14", "08:00") }); // sábado
    expect(findNextAvailableDay(ctx, { ...corte, staffId: null }, "2026-11-15")).toBeNull();
  });
});

describe("revalidação", () => {
  it("confere se um horário específico continua livre", () => {
    const ctx = makeContext();
    expect(
      isSlotAvailable(ctx, { ...corte, date: MONDAY, staffId: "ze", start: at(MONDAY, "09:00") })
        .ok,
    ).toBe(true);
    expect(
      isSlotAvailable(ctx, { ...corte, date: MONDAY, staffId: "ze", start: at(MONDAY, "09:10") })
        .ok,
    ).toBe(false);
    expect(
      isSlotAvailable(ctx, { ...corte, date: MONDAY, staffId: "ze", start: at(MONDAY, "12:00") })
        .ok,
    ).toBe(false);
  });

  it("timezone do fixture é Fortaleza", () => {
    expect(TZ).toBe("America/Fortaleza");
  });
});
