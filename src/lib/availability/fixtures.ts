import { localDateTimeToUtc } from "@/lib/dates";
import type { AvailabilityContext, WeekdayHours } from "./types";

export const TZ = "America/Fortaleza";
/** Segunda-feira, 16/11/2026. */
export const MONDAY = "2026-11-16";

export function at(date: string, time: string, tz = TZ): Date {
  return localDateTimeToUtc(date, time, tz);
}

export function week(opens: string, closes: string, closedDays: number[] = [0]): WeekdayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
    closedDays.includes(weekday)
      ? { weekday, is_open: false, opens_at: null, closes_at: null }
      : { weekday, is_open: true, opens_at: opens, closes_at: closes },
  );
}

/** Barbearia de teste: seg–sáb 9h–18h, almoço 12h–13h seg–sex, intervalos de 30 min. */
export function makeContext(overrides: Partial<AvailabilityContext> = {}): AvailabilityContext {
  return {
    timezone: TZ,
    slotIntervalMin: 30,
    minNoticeMin: 0,
    maxDaysAhead: 30,
    businessHours: week("09:00", "18:00"),
    breaks: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, starts_at: "12:00", ends_at: "13:00" })),
    staff: [
      { id: "ze", name: "Zé", serviceIds: ["corte", "barba", "combo"] },
      { id: "ana", name: "Ana", serviceIds: ["corte"] },
    ],
    appointments: [],
    blocks: [],
    now: at("2026-11-15", "08:00"), // domingo anterior
    ...overrides,
  };
}
