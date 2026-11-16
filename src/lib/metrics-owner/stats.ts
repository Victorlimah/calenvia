/**
 * Números do Início e do Financeiro (CAL-123/126/127/128). Funções puras sobre as linhas
 * agregadas que vêm de `appointment_stats()` no banco. Testadas em stats.test.ts.
 *
 * Regras:
 * - Faturamento = atendimentos concluídos (inclui os do "Registrar atendimento") + entradas
 *   manuais do financeiro. Valor nulo = o papel não vê valores (sem finance.view).
 * - Agendamentos = tudo que não foi cancelado.
 * - Taxa de falta = faltas / (concluídos + faltas).
 */
import { addLocalDays, diffLocalDays, timeToMinutes, weekdayOf, type LocalDate } from "@/lib/dates";
import { addMonths, MONTHS_PT, weekStartOf } from "@/lib/agenda/view";

export type StatRow = {
  day: LocalDate;
  serviceId: string;
  staffId: string;
  status: "confirmed" | "completed" | "no_show" | "canceled";
  source: "link" | "manual";
  paymentMethod: PaymentMethod | null;
  appointments: number;
  /** null = sem permissão para ver valores. */
  revenueCents: number | null;
  minutes: number;
};

export type EntryRow = {
  day: LocalDate;
  kind: "income" | "expense";
  category: string;
  amountCents: number;
};

export type PaymentMethod = "cash" | "pix" | "card" | "other";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  card: "Cartão",
  other: "Outro",
};

export type Range = { from: LocalDate; to: LocalDate }; // inclusivo

export const inRange = (day: LocalDate, r: Range) => day >= r.from && day <= r.to;

export type Totals = {
  appointments: number;
  completed: number;
  noShows: number;
  canceled: number;
  upcoming: number;
  /** null quando o papel não vê valores. */
  revenueCents: number | null;
  /** Previsto: concluídos + confirmados (ainda não atendidos). */
  expectedCents: number | null;
  bookedMinutes: number;
  noShowRate: number | null;
  averageTicketCents: number | null;
};

export function totals(rows: StatRow[], range: Range): Totals {
  let appointments = 0;
  let completed = 0;
  let noShows = 0;
  let canceled = 0;
  let upcoming = 0;
  let revenue = 0;
  let expected = 0;
  let minutes = 0;
  let hidden = false;
  for (const r of rows) {
    if (!inRange(r.day, range)) continue;
    if (r.revenueCents === null) hidden = true;
    if (r.status === "canceled") {
      canceled += r.appointments;
      continue;
    }
    appointments += r.appointments;
    minutes += r.minutes;
    if (r.status === "completed") {
      completed += r.appointments;
      revenue += r.revenueCents ?? 0;
      expected += r.revenueCents ?? 0;
    } else if (r.status === "no_show") noShows += r.appointments;
    else {
      upcoming += r.appointments;
      expected += r.revenueCents ?? 0;
    }
  }
  const attended = completed + noShows;
  return {
    appointments,
    completed,
    noShows,
    canceled,
    upcoming,
    revenueCents: hidden ? null : revenue,
    expectedCents: hidden ? null : expected,
    bookedMinutes: minutes,
    noShowRate: attended ? noShows / attended : null,
    averageTicketCents: hidden ? null : completed ? Math.round(revenue / completed) : 0,
  };
}

/** Variação em relação ao período anterior: 0.25 = +25%; null quando não dá para comparar. */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

/** Período anterior do mesmo tamanho (ex.: semana passada, mês passado). */
export function previousRange(r: Range, kind: "day" | "week" | "month" | "custom"): Range {
  if (kind === "month") {
    const from = addMonths(r.from, -1);
    return { from, to: addLocalDays(r.from, -1) };
  }
  const len = diffLocalDays(r.from, r.to) + 1;
  return { from: addLocalDays(r.from, -len), to: addLocalDays(r.from, -1) };
}

/** Intervalo do dia, da semana (segunda a domingo) ou do mês que contém a data. */
export function rangeOf(date: LocalDate, kind: "day" | "week" | "month"): Range {
  if (kind === "day") return { from: date, to: date };
  if (kind === "week") {
    const from = weekStartOf(date);
    return { from, to: addLocalDays(from, 6) };
  }
  const from = `${date.slice(0, 7)}-01`;
  return { from, to: addLocalDays(addMonths(from, 1), -1) };
}

export type Bucket = {
  key: string;
  label: string;
  revenueCents: number;
  appointments: number;
};

/**
 * Faturamento em barras por dia, semana ou mês dentro do intervalo. Inclui as entradas manuais
 * do financeiro (as despesas não entram). Buckets vazios aparecem com zero.
 */
export function revenueSeries(
  rows: StatRow[],
  entries: EntryRow[],
  range: Range,
  by: "day" | "week" | "month",
): Bucket[] {
  const keyOf = (day: LocalDate) =>
    by === "day" ? day : by === "week" ? weekStartOf(day) : day.slice(0, 7);
  const buckets = new Map<string, Bucket>();
  const first = by === "day" ? range.from : by === "week" ? weekStartOf(range.from) : range.from;
  for (let d = first; d <= range.to;) {
    const key = keyOf(d);
    if (!buckets.has(key))
      buckets.set(key, { key, label: bucketLabel(key, by), revenueCents: 0, appointments: 0 });
    d =
      by === "day"
        ? addLocalDays(d, 1)
        : by === "week"
          ? addLocalDays(d, 7)
          : addMonths(`${d.slice(0, 7)}-01`, 1);
  }
  for (const r of rows) {
    if (!inRange(r.day, range) || r.status !== "completed") continue;
    const b = buckets.get(keyOf(r.day));
    if (!b) continue;
    b.revenueCents += r.revenueCents ?? 0;
    b.appointments += r.appointments;
  }
  for (const e of entries) {
    if (e.kind !== "income" || !inRange(e.day, range)) continue;
    const b = buckets.get(keyOf(e.day));
    if (b) b.revenueCents += e.amountCents;
  }
  return [...buckets.values()];
}

function bucketLabel(key: string, by: "day" | "week" | "month"): string {
  if (by === "month") {
    const [y, m] = key.split("-").map(Number);
    return `${MONTHS_PT[m - 1].slice(0, 3)}/${String(y).slice(2)}`;
  }
  const [, m, d] = key.split("-").map(Number);
  return `${d}/${String(m).padStart(2, "0")}`;
}

/** Granularidade automática: até 31 dias por dia, até ~6 meses por semana, depois por mês. */
export function autoGranularity(range: Range): "day" | "week" | "month" {
  const len = diffLocalDays(range.from, range.to) + 1;
  return len <= 31 ? "day" : len <= 190 ? "week" : "month";
}

export type BreakdownRow = {
  id: string;
  label: string;
  appointments: number;
  revenueCents: number;
};

/** Concluídos por serviço ou por profissional, do maior faturamento para o menor. */
export function breakdown(
  rows: StatRow[],
  range: Range,
  by: "service" | "staff",
  names: Record<string, string>,
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();
  for (const r of rows) {
    if (!inRange(r.day, range) || r.status !== "completed") continue;
    const id = by === "service" ? r.serviceId : r.staffId;
    const row = map.get(id) ?? {
      id,
      label: names[id] ?? "Removido",
      appointments: 0,
      revenueCents: 0,
    };
    row.appointments += r.appointments;
    row.revenueCents += r.revenueCents ?? 0;
    map.set(id, row);
  }
  return [...map.values()].sort(
    (a, b) => b.revenueCents - a.revenueCents || b.appointments - a.appointments,
  );
}

/** Caixa por forma de pagamento (concluídos). "Não informado" quando ninguém marcou. */
export function paymentBreakdown(
  rows: StatRow[],
  range: Range,
): { method: PaymentMethod | null; label: string; appointments: number; revenueCents: number }[] {
  const order: (PaymentMethod | null)[] = ["cash", "pix", "card", "other", null];
  const map = new Map<PaymentMethod | null, { appointments: number; revenueCents: number }>();
  for (const r of rows) {
    if (!inRange(r.day, range) || r.status !== "completed") continue;
    const g = map.get(r.paymentMethod) ?? { appointments: 0, revenueCents: 0 };
    g.appointments += r.appointments;
    g.revenueCents += r.revenueCents ?? 0;
    map.set(r.paymentMethod, g);
  }
  return order
    .filter((m) => map.has(m))
    .map((m) => ({
      method: m,
      label: m ? PAYMENT_LABELS[m] : "Não informado",
      ...map.get(m)!,
    }));
}

/** Entradas manuais, despesas e saldo (CAL-127). */
export function cashSummary(rows: StatRow[], entries: EntryRow[], range: Range) {
  const t = totals(rows, range);
  const sum = (kind: EntryRow["kind"]) =>
    entries
      .filter((e) => e.kind === kind && inRange(e.day, range))
      .reduce((s, e) => s + e.amountCents, 0);
  const appointmentsCents = t.revenueCents ?? 0;
  const otherIncomeCents = sum("income");
  const expensesCents = sum("expense");
  return {
    appointmentsCents,
    otherIncomeCents,
    incomeCents: appointmentsCents + otherIncomeCents,
    expensesCents,
    balanceCents: appointmentsCents + otherIncomeCents - expensesCents,
  };
}

type Hours = {
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};
type Break = { weekday: number; starts_at: string; ends_at: string };

/**
 * Minutos de trabalho disponíveis no intervalo: para cada profissional ativo, o horário dele
 * (ou o do negócio) de cada dia, menos os intervalos do negócio. Base da taxa de ocupação.
 */
export function availableMinutes(
  range: Range,
  business: { hours: Hours[]; breaks: Break[] },
  staff: { id: string; hours?: Hours[] }[],
): number {
  let total = 0;
  for (let d = range.from; d <= range.to; d = addLocalDays(d, 1)) {
    const wd = weekdayOf(d);
    const breakMin = business.breaks
      .filter((b) => b.weekday === wd)
      .reduce(
        (s, b) => s + timeToMinutes(b.ends_at.slice(0, 5)) - timeToMinutes(b.starts_at.slice(0, 5)),
        0,
      );
    for (const s of staff) {
      const hours = s.hours && s.hours.length ? s.hours : business.hours;
      const h = hours.find((x) => x.weekday === wd);
      if (!h || !h.is_open || !h.opens_at || !h.closes_at) continue;
      const open = timeToMinutes(h.closes_at.slice(0, 5)) - timeToMinutes(h.opens_at.slice(0, 5));
      total += Math.max(open - (hours === business.hours ? breakMin : 0), 0);
    }
  }
  return total;
}

/** Ocupação = minutos agendados (não cancelados) / minutos disponíveis. */
export function occupancy(bookedMinutes: number, available: number): number | null {
  if (available <= 0) return null;
  return Math.min(bookedMinutes / available, 1);
}
