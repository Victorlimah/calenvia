/**
 * Navegação da agenda (CAL-120/121): visões, links que preservam os filtros, avançar/voltar
 * conforme a visão e a grade do mês. Funções puras, testadas em view.test.ts.
 *
 * Decisão do backlog (padrão adotado): a semana começa na segunda-feira.
 */
import { addLocalDays, weekdayOf, type LocalDate } from "@/lib/dates";

export type AgendaView = "lista" | "dia" | "semana" | "mes";

export const AGENDA_VIEWS: { key: AgendaView; label: string }[] = [
  { key: "lista", label: "Lista" },
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
];

/** Cookie com a última visão escolhida neste aparelho. */
export const AGENDA_VIEW_COOKIE = "calenvia_agenda_view";

export function parseView(value: unknown): AgendaView | null {
  return AGENDA_VIEWS.some((v) => v.key === value) ? (value as AgendaView) : null;
}

export type AgendaState = { date: LocalDate; view: AgendaView; staffId: string | null };

/** Link da agenda com a data, a visão e o filtro de profissional. */
export function agendaHref(state: AgendaState, patch: Partial<AgendaState> = {}): string {
  const s = { ...state, ...patch };
  const q = new URLSearchParams({ data: s.date, visao: s.view });
  if (s.staffId) q.set("profissional", s.staffId);
  return `/agenda?${q.toString()}`;
}

/** Semana começando na segunda-feira que contém a data. */
export function weekStartOf(date: LocalDate): LocalDate {
  return addLocalDays(date, -((weekdayOf(date) + 6) % 7));
}

export function weekDaysOf(date: LocalDate): LocalDate[] {
  const start = weekStartOf(date);
  return Array.from({ length: 7 }, (_, i) => addLocalDays(start, i));
}

function parts(date: LocalDate) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function fmt(y: number, m: number, d: number): LocalDate {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Mesmo dia em outro mês (dia 31 vira o último dia do mês, se ele for menor). */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const { y, m, d } = parts(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Anterior/próximo: Lista e Dia andam 1 dia; Semana, 7 dias; Mês, 1 mês. */
export function shiftDate(date: LocalDate, view: AgendaView, dir: 1 | -1): LocalDate {
  if (view === "semana") return addLocalDays(date, 7 * dir);
  if (view === "mes") return addMonths(date, dir);
  return addLocalDays(date, dir);
}

export const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const short = (m: number) => MONTHS_PT[m - 1].slice(0, 3);

/** "10 a 16 de nov", "27 de out a 2 de nov", "29 de dez de 2025 a 4 de jan de 2026". */
export function weekLabel(date: LocalDate): string {
  const days = weekDaysOf(date);
  const a = parts(days[0]);
  const b = parts(days[6]);
  if (a.y !== b.y) return `${a.d} de ${short(a.m)} de ${a.y} a ${b.d} de ${short(b.m)} de ${b.y}`;
  if (a.m !== b.m) return `${a.d} de ${short(a.m)} a ${b.d} de ${short(b.m)}`;
  return `${a.d} a ${b.d} de ${short(b.m)}`;
}

/** "novembro de 2026". */
export function monthLabel(date: LocalDate): string {
  const { y, m } = parts(date);
  return `${MONTHS_PT[m - 1]} de ${y}`;
}

export type MonthCell = { date: LocalDate; inMonth: boolean };

/** Grade do mês em semanas completas (segunda a domingo), com os dias de fora marcados. */
export function monthGrid(date: LocalDate): MonthCell[][] {
  const { y, m } = parts(date);
  const first = fmt(y, m, 1);
  const last = fmt(y, m, daysInMonth(y, m));
  const weeks: MonthCell[][] = [];
  for (let start = weekStartOf(first); start <= last; start = addLocalDays(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addLocalDays(start, i);
        return { date: d, inMonth: d.slice(0, 7) === first.slice(0, 7) };
      }),
    );
  }
  return weeks;
}

/** Intervalo de dias que a visão mostra (para carregar só o que aparece na tela). */
export function visibleRange(
  date: LocalDate,
  view: AgendaView,
): { from: LocalDate; to: LocalDate } {
  if (view === "semana") {
    const days = weekDaysOf(date);
    return { from: days[0], to: days[6] };
  }
  if (view === "mes") {
    const grid = monthGrid(date);
    return { from: grid[0][0].date, to: grid[grid.length - 1][6].date };
  }
  return { from: date, to: date };
}
