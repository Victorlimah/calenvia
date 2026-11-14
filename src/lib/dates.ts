/**
 * Datas e fuso horário.
 * - No banco tudo é UTC (timestamptz). Aqui instantes são `Date`.
 * - "Data local" = string `YYYY-MM-DD` no fuso do negócio.
 * - "Hora local" = string `HH:mm` (aceita `HH:mm:ss`, como vem do Postgres).
 */
import { addDays, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export type LocalDate = string; // YYYY-MM-DD
export type LocalTime = string; // HH:mm

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_RE.test(value)) return false;
  const d = parseISO(value);
  return !Number.isNaN(d.getTime()) && formatUtcDate(d) === value;
}

function formatUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function assertLocalDate(date: string): void {
  if (!isLocalDate(date)) throw new Error(`Data inválida: ${date}`);
}

/** "09:30" → 570 */
export function timeToMinutes(time: string): number {
  if (!LOCAL_TIME_RE.test(time)) throw new Error(`Hora inválida: ${time}`);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 570 → "09:30" (aceita 1440 = "24:00" para fim de dia) */
export function minutesToTime(minutes: number): LocalTime {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Data local (no fuso) de um instante. */
export function toLocalDate(instant: Date, timezone: string): LocalDate {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

/** Minutos desde a meia-noite local do instante. */
export function localMinutesOf(instant: Date, timezone: string): number {
  return timeToMinutes(formatInTimeZone(instant, timezone, "HH:mm"));
}

/** Data local + minutos desde a meia-noite local → instante UTC (aceita ≥ 1440 = dias seguintes). */
export function localMinutesToUtc(date: LocalDate, minutes: number, timezone: string): Date {
  assertLocalDate(date);
  const day = addLocalDays(date, Math.floor(minutes / 1440));
  return fromZonedTime(`${day}T${minutesToTime(minutes % 1440)}:00`, timezone);
}

/** Data local + "HH:mm" → instante UTC. */
export function localDateTimeToUtc(date: LocalDate, time: string, timezone: string): Date {
  return localMinutesToUtc(date, timeToMinutes(time), timezone);
}

/** Início (inclusivo) e fim (exclusivo) do dia local, em UTC. */
export function zonedDayRange(date: LocalDate, timezone: string): { start: Date; end: Date } {
  return {
    start: localMinutesToUtc(date, 0, timezone),
    end: localMinutesToUtc(addLocalDays(date, 1), 0, timezone),
  };
}

/** Soma dias a uma data local. */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  assertLocalDate(date);
  return formatUtcDate(addDays(parseISO(`${date}T00:00:00Z`), days));
}

/** Diferença em dias entre duas datas locais (b - a). */
export function diffLocalDays(a: LocalDate, b: LocalDate): number {
  assertLocalDate(a);
  assertLocalDate(b);
  return Math.round(
    (parseISO(`${b}T00:00:00Z`).getTime() - parseISO(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
}

/** Dia da semana de uma data local: 0 = domingo … 6 = sábado. */
export function weekdayOf(date: LocalDate): number {
  assertLocalDate(date);
  return parseISO(`${date}T12:00:00Z`).getUTCDay();
}

/** "Hoje" no fuso do negócio. */
export function todayIn(timezone: string, now: Date = new Date()): LocalDate {
  return toLocalDate(now, timezone);
}

/** Período de cota de mensagens (YYYY-MM) no fuso do negócio. */
export function periodOf(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM");
}

// ---------------------------------------------------------------------------
// Formatação pt-BR
// ---------------------------------------------------------------------------

function fmt(instant: Date, timezone: string, pattern: string): string {
  return formatInTimeZone(instant, timezone, pattern, { locale: ptBR });
}

/** 15/11/2026 */
export function formatDate(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "dd/MM/yyyy");
}

/** 15/11 */
export function formatShortDate(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "dd/MM");
}

/** 14:30 */
export function formatTime(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "HH:mm");
}

/** sábado */
export function formatWeekday(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "EEEE");
}

/** sáb */
export function formatWeekdayShort(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "EEE");
}

/** sábado, 15/11 */
export function formatDayLabel(instant: Date, timezone: string): string {
  return `${formatWeekday(instant, timezone)}, ${formatShortDate(instant, timezone)}`;
}

/** 15 de novembro */
export function formatLongDate(instant: Date, timezone: string): string {
  return fmt(instant, timezone, "d 'de' MMMM");
}

/** Para datas locais (sem hora): usa meio-dia local para evitar viradas. */
export function localDateToInstant(date: LocalDate, timezone: string): Date {
  return localMinutesToUtc(date, 12 * 60, timezone);
}

/** Duração amigável: 30 → "30 min", 90 → "1h30", 60 → "1h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "09:00" → "9h", "09:30" → "9h30" */
export function formatHourShort(time: string): string {
  const minutes = timeToMinutes(time);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}
