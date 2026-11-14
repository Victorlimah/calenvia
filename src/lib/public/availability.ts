import "server-only";
import {
  findNextAvailableDay,
  getDaySlots,
  getDaysSummary,
  type DayPeriod,
  type DayStatus,
} from "@/lib/availability";
import { loadAvailabilityContext } from "@/lib/booking";
import { addLocalDays, diffLocalDays, todayIn, zonedDayRange, type LocalDate } from "@/lib/dates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PublicBusiness } from "./business";

export const STRIP_DAYS = 14;

export type PublicSlot = { time: string; start: string };
export type PublicDay = { date: LocalDate; status: DayStatus; count: number };
export type PublicAvailability = {
  today: LocalDate;
  from: LocalDate;
  days: PublicDay[];
  date: LocalDate | null;
  status: DayStatus | null;
  groups: Record<DayPeriod, PublicSlot[]>;
  nextAvailable: LocalDate | null;
  maxDate: LocalDate;
};

/** Disponibilidade para o fluxo público: faixa de dias + horários do dia escolhido. */
export async function publicAvailability(
  business: PublicBusiness,
  query: {
    serviceId: string;
    durationMin: number;
    staffId: string | null;
    from?: string | null;
    date?: string | null;
  },
  now: Date = new Date(),
): Promise<PublicAvailability> {
  const admin = createSupabaseAdminClient();
  const today = todayIn(business.timezone, now);
  const maxDate = addLocalDays(today, business.max_days_ahead);
  let from = query.from && diffLocalDays(today, query.from) >= 0 ? query.from : today;
  if (diffLocalDays(from, maxDate) < 0) from = today;

  const windowEnd = addLocalDays(from, STRIP_DAYS);
  const ctx = await loadAvailabilityContext(
    admin,
    business,
    {
      from: zonedDayRange(from, business.timezone).start,
      to: zonedDayRange(windowEnd, business.timezone).start,
    },
    now,
  );
  const base = {
    serviceId: query.serviceId,
    durationMin: query.durationMin,
    staffId: query.staffId,
  };
  const days = getDaysSummary(ctx, base, from, STRIP_DAYS);

  const requested = query.date && days.some((d) => d.date === query.date) ? query.date : null;
  const date = requested ?? days.find((d) => d.status === "open")?.date ?? null;

  let nextAvailable = days.find((d) => d.status === "open")?.date ?? null;
  if (!nextAvailable && diffLocalDays(windowEnd, maxDate) >= 0) {
    // Procura além da faixa (até o limite de dias à frente).
    const wide = await loadAvailabilityContext(
      admin,
      business,
      {
        from: zonedDayRange(windowEnd, business.timezone).start,
        to: zonedDayRange(addLocalDays(maxDate, 1), business.timezone).start,
      },
      now,
    );
    nextAvailable = findNextAvailableDay(wide, base, windowEnd);
  }

  const empty = { morning: [], afternoon: [], evening: [] };
  if (!date)
    return { today, from, days, date: null, status: null, groups: empty, nextAvailable, maxDate };
  const day = getDaySlots(ctx, { ...base, date });
  const map = (list: typeof day.slots) =>
    list.map((s) => ({ time: s.time, start: s.start.toISOString() }));
  return {
    today,
    from,
    days,
    date,
    status: day.status,
    groups: {
      morning: map(day.groups.morning),
      afternoon: map(day.groups.afternoon),
      evening: map(day.groups.evening),
    },
    nextAvailable,
    maxDate,
  };
}
