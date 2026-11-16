/**
 * Dados das visões Mês, Semana e Dia da agenda (CAL-121/122). Funções puras: as telas só
 * desenham. Testadas em calendar.test.ts.
 */
import { localMinutesOf, timeToMinutes, toLocalDate, weekdayOf, type LocalDate } from "@/lib/dates";
import type { WeekdayHours } from "@/lib/availability/types";
import type { AgendaAppointment, AgendaBlock } from "./timeline";

/** Agendamentos não cancelados por dia (no fuso do negócio), em ordem de horário. */
export function appointmentsByDay(
  appointments: AgendaAppointment[],
  timezone: string,
): Map<LocalDate, AgendaAppointment[]> {
  const map = new Map<LocalDate, AgendaAppointment[]>();
  for (const a of [...appointments].sort((x, y) => x.start.getTime() - y.start.getTime())) {
    if (a.status === "canceled") continue;
    const day = toLocalDate(a.start, timezone);
    map.set(day, [...(map.get(day) ?? []), a]);
  }
  return map;
}

export type DayState = "open" | "closed" | "blocked";

/**
 * Dia fechado (pelo horário de funcionamento) ou bloqueado inteiro (bloqueio geral, ou do
 * profissional filtrado, cobrindo todo o horário de funcionamento do dia).
 */
export function dayState(
  date: LocalDate,
  hours: WeekdayHours[],
  blocks: AgendaBlock[],
  timezone: string,
  staffId: string | null = null,
): DayState {
  const h = hours.find((x) => x.weekday === weekdayOf(date));
  if (!h || !h.is_open || !h.opens_at || !h.closes_at) return "closed";
  const open = timeToMinutes(h.opens_at.slice(0, 5));
  const close = timeToMinutes(h.closes_at.slice(0, 5));
  const covers = blocks.some((b) => {
    if (b.staffId !== null && b.staffId !== staffId) return false;
    const startDay = toLocalDate(b.start, timezone);
    const endDay = toLocalDate(b.end, timezone);
    const from =
      startDay < date ? 0 : startDay > date ? Infinity : localMinutesOf(b.start, timezone);
    const to =
      endDay > date ? 24 * 60 : endDay < date ? -Infinity : localMinutesOf(b.end, timezone);
    return from <= open && to >= close;
  });
  return covers ? "blocked" : "open";
}

/** Eixo de horas da grade: do primeiro horário de abertura ao último fechamento da semana. */
export function hourAxis(
  hours: WeekdayHours[],
  appointments: AgendaAppointment[] = [],
  timezone = "UTC",
): { startMin: number; endMin: number } {
  let start = Infinity;
  let end = -Infinity;
  for (const h of hours) {
    if (!h.is_open || !h.opens_at || !h.closes_at) continue;
    start = Math.min(start, timeToMinutes(h.opens_at.slice(0, 5)));
    end = Math.max(end, timeToMinutes(h.closes_at.slice(0, 5)));
  }
  for (const a of appointments) {
    if (a.status === "canceled") continue;
    start = Math.min(start, localMinutesOf(a.start, timezone));
    const endMin = localMinutesOf(a.end, timezone);
    end = Math.max(end, endMin === 0 ? 24 * 60 : endMin);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { startMin: 8 * 60, endMin: 20 * 60 };
  }
  return { startMin: Math.floor(start / 60) * 60, endMin: Math.ceil(end / 60) * 60 };
}

export type PlacedItem<T> = {
  item: T;
  /** Posição e altura em % da coluna. */
  top: number;
  height: number;
  /** Faixa (para itens que se sobrepõem lado a lado) e total de faixas do grupo. */
  lane: number;
  lanes: number;
};

/**
 * Posiciona itens numa coluna de horas: altura proporcional à duração e itens que se
 * sobrepõem divididos em faixas lado a lado.
 */
export function placeInColumn<T extends { start: Date; end: Date }>(
  items: T[],
  axis: { startMin: number; endMin: number },
  timezone: string,
): PlacedItem<T>[] {
  const span = axis.endMin - axis.startMin;
  const sorted = [...items].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime(),
  );
  const placed: PlacedItem<T>[] = [];
  let group: PlacedItem<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;
  const closeGroup = () => {
    for (const p of group) p.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const item of sorted) {
    const s = item.start.getTime();
    const e = item.end.getTime();
    if (s >= groupEnd) {
      closeGroup();
      groupEnd = e;
    } else groupEnd = Math.max(groupEnd, e);
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    const startMin = Math.max(localMinutesOf(item.start, timezone), axis.startMin);
    let endMin = localMinutesOf(item.end, timezone);
    if (endMin <= startMin) endMin = axis.endMin; // passa da meia-noite
    endMin = Math.min(endMin, axis.endMin);
    const p: PlacedItem<T> = {
      item,
      top: ((startMin - axis.startMin) / span) * 100,
      height: (Math.max(endMin - startMin, 15) / span) * 100,
      lane,
      lanes: 1,
    };
    group.push(p);
    placed.push(p);
  }
  closeGroup();
  return placed;
}

/** Posição da linha do "agora" em % da coluna, ou null fora do eixo. */
export function nowLine(
  now: Date,
  axis: { startMin: number; endMin: number },
  timezone: string,
): number | null {
  const m = localMinutesOf(now, timezone);
  if (m < axis.startMin || m > axis.endMin) return null;
  return ((m - axis.startMin) / (axis.endMin - axis.startMin)) * 100;
}
