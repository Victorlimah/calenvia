import { describe, expect, it } from "vitest";
import {
  addLocalDays,
  diffLocalDays,
  formatDate,
  formatDayLabel,
  formatDuration,
  formatLongDate,
  formatTime,
  formatWeekday,
  isLocalDate,
  localDateTimeToUtc,
  localMinutesOf,
  minutesToTime,
  periodOf,
  timeToMinutes,
  toLocalDate,
  todayIn,
  weekdayOf,
  zonedDayRange,
} from "./dates";

const FOR = "America/Fortaleza"; // UTC-3
const MAO = "America/Manaus"; // UTC-4
const NOR = "America/Noronha"; // UTC-2

describe("horas e minutos", () => {
  it("converte HH:mm em minutos e volta", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("18:00:00")).toBe(1080);
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(0)).toBe("00:00");
  });
  it("rejeita hora inválida", () => {
    expect(() => timeToMinutes("25:00")).toThrow();
    expect(() => timeToMinutes("9h")).toThrow();
  });
});

describe("fuso horário", () => {
  it("hora local de Fortaleza vira UTC+3", () => {
    expect(localDateTimeToUtc("2026-11-15", "09:00", FOR).toISOString()).toBe(
      "2026-11-15T12:00:00.000Z",
    );
  });

  it("virada de dia: 22h em Fortaleza já é dia seguinte em UTC", () => {
    const instant = localDateTimeToUtc("2026-11-15", "22:00", FOR);
    expect(instant.toISOString()).toBe("2026-11-16T01:00:00.000Z");
    expect(toLocalDate(instant, FOR)).toBe("2026-11-15");
    expect(toLocalDate(instant, "UTC")).toBe("2026-11-16");
  });

  it("01h UTC ainda é o dia anterior no Brasil", () => {
    const instant = new Date("2026-11-16T01:30:00Z");
    expect(toLocalDate(instant, FOR)).toBe("2026-11-15");
    expect(localMinutesOf(instant, FOR)).toBe(22 * 60 + 30);
    expect(formatTime(instant, FOR)).toBe("22:30");
  });

  it("fusos diferentes (Manaus e Noronha)", () => {
    expect(localDateTimeToUtc("2026-11-15", "09:00", MAO).toISOString()).toBe(
      "2026-11-15T13:00:00.000Z",
    );
    expect(localDateTimeToUtc("2026-11-15", "09:00", NOR).toISOString()).toBe(
      "2026-11-15T11:00:00.000Z",
    );
  });

  it("intervalo do dia local em UTC", () => {
    const { start, end } = zonedDayRange("2026-11-15", FOR);
    expect(start.toISOString()).toBe("2026-11-15T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-16T03:00:00.000Z");
  });

  it("'hoje' depende do fuso", () => {
    const now = new Date("2026-11-15T02:00:00Z");
    expect(todayIn(FOR, now)).toBe("2026-11-14");
    expect(todayIn("UTC", now)).toBe("2026-11-15");
  });

  it("período da cota respeita o fuso na virada do mês", () => {
    const instant = new Date("2026-12-01T01:00:00Z");
    expect(periodOf(instant, FOR)).toBe("2026-11");
    expect(periodOf(instant, "UTC")).toBe("2026-12");
  });
});

describe("datas locais", () => {
  it("valida datas", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("15/11/2026")).toBe(false);
  });
  it("soma dias atravessando mês e ano", () => {
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addLocalDays("2026-11-01", -1)).toBe("2026-10-31");
  });
  it("diferença entre datas", () => {
    expect(diffLocalDays("2026-11-14", "2026-12-14")).toBe(30);
  });
  it("dia da semana", () => {
    expect(weekdayOf("2026-11-15")).toBe(0); // domingo
    expect(weekdayOf("2026-11-14")).toBe(6); // sábado
  });
});

describe("formatação pt-BR", () => {
  const instant = localDateTimeToUtc("2026-11-14", "14:30", FOR);
  it("formata data, hora e dia", () => {
    expect(formatDate(instant, FOR)).toBe("14/11/2026");
    expect(formatTime(instant, FOR)).toBe("14:30");
    expect(formatWeekday(instant, FOR)).toBe("sábado");
    expect(formatDayLabel(instant, FOR)).toBe("sábado, 14/11");
    expect(formatLongDate(instant, FOR)).toBe("14 de novembro");
  });
  it("formata duração", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h30");
  });
});
