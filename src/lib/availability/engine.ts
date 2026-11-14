/**
 * Motor de horários disponíveis (CLAUDE.md §5). Funções puras: sem banco, sem relógio.
 */
import {
  addLocalDays,
  diffLocalDays,
  localMinutesToUtc,
  minutesToTime,
  timeToMinutes,
  todayIn,
  weekdayOf,
  type LocalDate,
} from "@/lib/dates";
import type {
  AvailabilityContext,
  DayPeriod,
  DaySlots,
  DayStatus,
  Slot,
  SlotQuery,
  StaffAvailability,
  WeekdayHours,
} from "./types";

type Interval = { start: number; end: number }; // ms UTC

/** Há conflito quando inicioA < fimB && inicioB < fimA. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Horário do dia para o profissional: o próprio (se tiver) ou o do negócio. */
export function hoursForStaff(
  ctx: AvailabilityContext,
  staff: StaffAvailability,
  weekday: number,
): WeekdayHours | undefined {
  const source = staff.hours && staff.hours.length > 0 ? staff.hours : ctx.businessHours;
  return source.find((h) => h.weekday === weekday);
}

function isOpen(
  h: WeekdayHours | undefined,
): h is WeekdayHours & { opens_at: string; closes_at: string } {
  return Boolean(h && h.is_open && h.opens_at && h.closes_at);
}

export function periodOf(time: string): DayPeriod {
  const minutes = timeToMinutes(time);
  if (minutes < 12 * 60) return "morning";
  if (minutes < 18 * 60) return "afternoon";
  return "evening";
}

function emptyDay(date: LocalDate, status: DayStatus): DaySlots {
  return { date, status, slots: [], groups: { morning: [], afternoon: [], evening: [] } };
}

/** Profissionais que fazem o serviço (e o escolhido, se houver). */
export function eligibleStaff(
  ctx: AvailabilityContext,
  query: Pick<SlotQuery, "serviceId" | "staffId">,
) {
  return ctx.staff.filter(
    (s) =>
      s.serviceIds.includes(query.serviceId) && (query.staffId === null || s.id === query.staffId),
  );
}

/** Horários livres de um dia. */
export function getDaySlots(ctx: AvailabilityContext, query: SlotQuery): DaySlots {
  const { date, durationMin } = query;
  const today = todayIn(ctx.timezone, ctx.now);
  const offset = diffLocalDays(today, date);
  if (offset < 0) return emptyDay(date, "past");
  if (offset > ctx.maxDaysAhead) return emptyDay(date, "too_far");

  const staff = eligibleStaff(ctx, query);
  if (staff.length === 0) return emptyDay(date, "no_staff");

  const weekday = weekdayOf(date);
  const working = staff
    .map((s) => ({ staff: s, hours: hoursForStaff(ctx, s, weekday) }))
    .filter(
      (
        x,
      ): x is {
        staff: StaffAvailability;
        hours: WeekdayHours & { opens_at: string; closes_at: string };
      } => isOpen(x.hours),
    );
  if (working.length === 0) return emptyDay(date, "closed");

  const toUtc = (minutes: number) => localMinutesToUtc(date, minutes, ctx.timezone).getTime();
  const earliest = ctx.now.getTime() + ctx.minNoticeMin * 60_000;
  const durationMs = durationMin * 60_000;

  const breaks: Interval[] = ctx.breaks
    .filter((b) => b.weekday === weekday)
    .map((b) => ({
      start: toUtc(timeToMinutes(b.starts_at)),
      end: toUtc(timeToMinutes(b.ends_at)),
    }));

  const busyByStaff = new Map<string, Interval[]>();
  for (const { staff: s } of working) {
    const busy: Interval[] = [];
    for (const a of ctx.appointments) {
      if (a.staffId !== s.id || a.status === "canceled") continue;
      if (query.excludeAppointmentId && a.id === query.excludeAppointmentId) continue;
      busy.push({ start: a.start.getTime(), end: a.end.getTime() });
    }
    for (const b of ctx.blocks) {
      if (b.staffId === null || b.staffId === s.id)
        busy.push({ start: b.start.getTime(), end: b.end.getTime() });
    }
    busyByStaff.set(s.id, busy);
  }

  // Candidatos: a cada slot_interval_min a partir da abertura de cada profissional.
  const candidates = new Map<number, string[]>(); // minuto local → staffIds livres
  for (const { staff: s, hours } of working) {
    const open = timeToMinutes(hours.opens_at);
    const close = timeToMinutes(hours.closes_at);
    const busy = busyByStaff.get(s.id) ?? [];
    for (let m = open; m + durationMin <= close; m += ctx.slotIntervalMin) {
      const start = toUtc(m);
      const slot = { start, end: start + durationMs };
      if (start < earliest) continue;
      if (breaks.some((b) => overlaps(slot, b))) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      const list = candidates.get(m) ?? [];
      list.push(s.id);
      candidates.set(m, list);
    }
  }

  const slots: Slot[] = [...candidates.entries()]
    .sort(([a], [b]) => a - b)
    .map(([m, staffIds]) => {
      const start = new Date(toUtc(m));
      return {
        start,
        end: new Date(start.getTime() + durationMs),
        time: minutesToTime(m),
        staffIds,
      };
    });

  if (slots.length === 0) {
    // Todos os horários do dia já passaram (hoje) contam como "full" também.
    return emptyDay(date, "full");
  }
  const groups: DaySlots["groups"] = { morning: [], afternoon: [], evening: [] };
  for (const slot of slots) groups[periodOf(slot.time)].push(slot);
  return { date, status: "open", slots, groups };
}

export type DaySummary = { date: LocalDate; status: DayStatus; count: number };

/** Resumo de vários dias (faixa de datas do agendamento). */
export function getDaysSummary(
  ctx: AvailabilityContext,
  query: Omit<SlotQuery, "date">,
  from: LocalDate,
  days: number,
): DaySummary[] {
  const out: DaySummary[] = [];
  for (let i = 0; i < days; i++) {
    const date = addLocalDays(from, i);
    const day = getDaySlots(ctx, { ...query, date });
    out.push({ date, status: day.status, count: day.slots.length });
  }
  return out;
}

/** Próximo dia com horário livre a partir de `from` (inclusive), dentro do limite de dias. */
export function findNextAvailableDay(
  ctx: AvailabilityContext,
  query: Omit<SlotQuery, "date">,
  from: LocalDate,
): LocalDate | null {
  const today = todayIn(ctx.timezone, ctx.now);
  const start = diffLocalDays(today, from) < 0 ? today : from;
  const remaining = ctx.maxDaysAhead - diffLocalDays(today, start);
  for (let i = 0; i <= remaining; i++) {
    const date = addLocalDays(start, i);
    if (getDaySlots(ctx, { ...query, date }).status === "open") return date;
  }
  return null;
}

/** O horário escolhido continua livre? (revalidação no servidor) */
export function isSlotAvailable(
  ctx: AvailabilityContext,
  query: SlotQuery & { start: Date },
): { ok: true; staffIds: string[] } | { ok: false } {
  const day = getDaySlots(ctx, query);
  const slot = day.slots.find((s) => s.start.getTime() === query.start.getTime());
  return slot ? { ok: true, staffIds: slot.staffIds } : { ok: false };
}
