/**
 * CAL-044 · Bateria de testes do motor de horários (CLAUDE.md §5).
 */
import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "@/lib/dates";
import { getDaySlots } from "./engine";
import { MONDAY, at, makeContext, week } from "./fixtures";

const q = (over: Partial<Parameters<typeof getDaySlots>[1]> = {}) => ({
  date: MONDAY,
  serviceId: "corte",
  durationMin: 30,
  staffId: "ze" as string | null,
  ...over,
});
const times = (
  ctx: ReturnType<typeof makeContext>,
  over: Partial<Parameters<typeof getDaySlots>[1]> = {},
) => getDaySlots(ctx, q(over)).slots.map((s) => s.time);

describe("serviço precisa caber inteiro", () => {
  it("serviço de 60 min não começa às 17h30 se fecha às 18h", () => {
    const t = times(makeContext(), { serviceId: "combo", durationMin: 60 });
    expect(t).toContain("17:00");
    expect(t).not.toContain("17:30");
  });

  it("serviço de 90 min não atravessa o almoço", () => {
    const t = times(makeContext(), { serviceId: "combo", durationMin: 90 });
    expect(t).toContain("10:30"); // 10h30–12h ok
    expect(t).not.toContain("11:00"); // 11h–12h30 atravessa
    expect(t).not.toContain("11:30");
    expect(t).toContain("13:00");
    expect(t.at(-1)).toBe("16:30");
  });

  it("serviço maior que o dia não tem horário", () => {
    const ctx = makeContext({ businessHours: week("09:00", "10:00"), breaks: [] });
    expect(getDaySlots(ctx, q({ durationMin: 90 })).status).toBe("full");
  });

  it("dia com dois intervalos", () => {
    const ctx = makeContext({
      breaks: [
        { weekday: 1, starts_at: "10:00", ends_at: "10:30" },
        { weekday: 1, starts_at: "15:00", ends_at: "15:30" },
      ],
    });
    const t = times(ctx);
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("15:00");
    expect(t).toContain("12:00"); // sem almoço neste cenário
  });
});

describe("conflitos", () => {
  it("agendamento existente bloqueia só os horários que se sobrepõem", () => {
    const ctx = makeContext({
      appointments: [{ staffId: "ze", start: at(MONDAY, "10:00"), end: at(MONDAY, "11:00") }],
    });
    const t = times(ctx, { durationMin: 60 });
    expect(t).toContain("09:00"); // 9h–10h encosta, não conflita
    expect(t).not.toContain("09:30");
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("10:30");
    expect(t).toContain("11:00");
  });

  it("cancelado não bloqueia; concluído e falta bloqueiam", () => {
    const appointments = [
      {
        staffId: "ze",
        start: at(MONDAY, "09:00"),
        end: at(MONDAY, "09:30"),
        status: "canceled" as const,
      },
      {
        staffId: "ze",
        start: at(MONDAY, "10:00"),
        end: at(MONDAY, "10:30"),
        status: "completed" as const,
      },
      {
        staffId: "ze",
        start: at(MONDAY, "11:00"),
        end: at(MONDAY, "11:30"),
        status: "no_show" as const,
      },
    ];
    const t = times(makeContext({ appointments }));
    expect(t).toContain("09:00");
    expect(t).not.toContain("10:00");
    expect(t).not.toContain("11:00");
  });

  it("agendamento de outro profissional não bloqueia", () => {
    const ctx = makeContext({
      appointments: [{ staffId: "ana", start: at(MONDAY, "09:00"), end: at(MONDAY, "18:00") }],
    });
    expect(times(ctx)).toContain("09:00");
  });

  it("remarcação ignora o próprio agendamento", () => {
    const ctx = makeContext({
      appointments: [
        { id: "a1", staffId: "ze", start: at(MONDAY, "09:00"), end: at(MONDAY, "09:30") },
      ],
    });
    expect(times(ctx)).not.toContain("09:00");
    expect(times(ctx, { excludeAppointmentId: "a1" })).toContain("09:00");
  });
});

describe("bloqueios", () => {
  it("bloqueio do profissional só vale para ele", () => {
    const ctx = makeContext({
      blocks: [{ staffId: "ze", start: at(MONDAY, "14:00"), end: at(MONDAY, "16:00") }],
    });
    expect(times(ctx)).not.toContain("14:00");
    expect(times(ctx)).not.toContain("15:30");
    expect(times(ctx)).toContain("16:00");
    expect(times(ctx, { staffId: "ana" })).toContain("14:00");
  });

  it("bloqueio geral vale para todos", () => {
    const ctx = makeContext({
      blocks: [{ staffId: null, start: at(MONDAY, "14:00"), end: at(MONDAY, "15:00") }],
    });
    expect(times(ctx, { staffId: "ze" })).not.toContain("14:00");
    expect(times(ctx, { staffId: "ana" })).not.toContain("14:30");
    expect(times(ctx, { staffId: null })).not.toContain("14:00");
  });

  it("bloqueio de vários dias", () => {
    const ctx = makeContext({
      blocks: [{ staffId: null, start: at("2026-11-15", "00:00"), end: at("2026-11-18", "00:00") }],
    });
    expect(getDaySlots(ctx, q({ date: "2026-11-17" })).status).toBe("full");
    expect(getDaySlots(ctx, q({ date: "2026-11-18" })).status).toBe("open");
  });
});

describe("antecedência mínima e passado", () => {
  it("hoje: só a partir de agora + antecedência", () => {
    const ctx = makeContext({ now: at(MONDAY, "10:10"), minNoticeMin: 60 });
    const t = times(ctx);
    expect(t[0]).toBe("11:30"); // 11h10 em diante
  });

  it("sem antecedência: o horário atual já passou", () => {
    const ctx = makeContext({ now: at(MONDAY, "09:00"), minNoticeMin: 0 });
    expect(times(ctx)[0]).toBe("09:00"); // começa agora: ainda vale
    const later = makeContext({ now: at(MONDAY, "09:01"), minNoticeMin: 0 });
    expect(times(later)[0]).toBe("09:30");
  });

  it("antecedência de 1 dia esconde o dia de hoje inteiro", () => {
    const ctx = makeContext({ now: at(MONDAY, "08:00"), minNoticeMin: 1440 });
    expect(getDaySlots(ctx, q()).status).toBe("full");
    expect(getDaySlots(ctx, q({ date: "2026-11-17" })).slots[0].time).toBe("09:00");
  });

  it("depois do fechamento de hoje, o dia fica sem horários", () => {
    const ctx = makeContext({ now: at(MONDAY, "18:30") });
    expect(getDaySlots(ctx, q()).status).toBe("full");
  });
});

describe("horário próprio do profissional", () => {
  it("sobrescreve o horário do negócio", () => {
    const ctx = makeContext({
      staff: [
        { id: "ze", name: "Zé", serviceIds: ["corte"], hours: week("14:00", "20:00") },
        { id: "ana", name: "Ana", serviceIds: ["corte"] },
      ],
    });
    const ze = times(ctx);
    expect(ze[0]).toBe("14:00");
    expect(ze.at(-1)).toBe("19:30");
    expect(times(ctx, { staffId: "ana" })[0]).toBe("09:00");
  });

  it("profissional de folga num dia em que o negócio abre", () => {
    const ctx = makeContext({
      staff: [
        { id: "ze", name: "Zé", serviceIds: ["corte"], hours: week("09:00", "18:00", [0, 1]) },
      ],
    });
    expect(getDaySlots(ctx, q()).status).toBe("closed");
  });

  it("sem preferência junta os horários de todos", () => {
    const ctx = makeContext({
      breaks: [],
      staff: [
        { id: "ze", name: "Zé", serviceIds: ["corte"], hours: week("14:00", "20:00") },
        { id: "ana", name: "Ana", serviceIds: ["corte"], hours: week("08:00", "12:00") },
      ],
    });
    const day = getDaySlots(ctx, q({ staffId: null }));
    expect(day.slots[0].time).toBe("08:00");
    expect(day.slots.at(-1)!.time).toBe("19:30");
    expect(day.groups.evening.map((s) => s.time)).toEqual(["18:00", "18:30", "19:00", "19:30"]);
  });
});

describe("fuso horário", () => {
  it("negócio em Manaus (UTC-4)", () => {
    const ctx = makeContext({
      timezone: "America/Manaus",
      now: localDateTimeToUtc("2026-11-15", "08:00", "America/Manaus"),
    });
    const day = getDaySlots(ctx, q());
    expect(day.slots[0].time).toBe("09:00");
    expect(day.slots[0].start.toISOString()).toBe("2026-11-16T13:00:00.000Z");
  });

  it("'hoje' é calculado no fuso do negócio (23h em Fortaleza = dia seguinte em UTC)", () => {
    // Domingo 15/11 às 23h em Fortaleza = segunda 16/11 02h UTC
    const ctx = makeContext({ now: at("2026-11-15", "23:00") });
    expect(getDaySlots(ctx, q({ date: "2026-11-15" })).status).toBe("closed");
    expect(getDaySlots(ctx, q({ date: MONDAY })).slots[0].time).toBe("09:00");
  });

  it("noite que passa da meia-noite em UTC fica no dia local certo", () => {
    const ctx = makeContext({ businessHours: week("18:00", "23:00"), breaks: [] });
    const day = getDaySlots(ctx, q());
    expect(day.slots.at(-1)!.time).toBe("22:30");
    expect(day.slots.at(-1)!.start.toISOString()).toBe("2026-11-17T01:30:00.000Z");
    expect(day.groups.evening).toHaveLength(10);
  });

  it("agendamento de ontem à noite (UTC de hoje) não afeta hoje cedo", () => {
    const ctx = makeContext({
      businessHours: week("00:00", "23:59"),
      breaks: [],
      appointments: [
        { staffId: "ze", start: at("2026-11-15", "23:00"), end: at("2026-11-15", "23:30") },
      ],
    });
    expect(times(ctx)[0]).toBe("00:00");
  });
});
