/** Relatório do mês (CAL-100): faturamento, faltas e quebras. Função pura. */
import { localMinutesOf, toLocalDate, weekdayOf } from "@/lib/dates";

export type ReportAppointment = {
  starts_at: string;
  status: string;
  price_cents: number;
  service: string;
  staff: string;
  customer_id: string;
  customer_name: string;
};

export type Breakdown = { label: string; count: number; revenueCents: number }[];

export type MonthlyReport = {
  total: number;
  completed: number;
  noShows: number;
  canceled: number;
  upcoming: number;
  revenueCents: number;
  expectedCents: number;
  lostCents: number;
  averageTicketCents: number;
  noShowRate: number; // faltas / (concluídos + faltas)
  byService: Breakdown;
  byStaff: Breakdown;
  byWeekday: Breakdown;
  byPeriod: Breakdown;
  topCustomers: { id: string; name: string; visits: number; revenueCents: number }[];
};

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function group(
  list: ReportAppointment[],
  key: (a: ReportAppointment) => string,
  order?: string[],
): Breakdown {
  const map = new Map<string, { count: number; revenueCents: number }>();
  for (const a of list) {
    const k = key(a);
    const g = map.get(k) ?? { count: 0, revenueCents: 0 };
    g.count++;
    if (a.status === "completed") g.revenueCents += a.price_cents;
    map.set(k, g);
  }
  const rows = [...map.entries()].map(([label, g]) => ({ label, ...g }));
  return order
    ? order.filter((l) => map.has(l)).map((l) => rows.find((r) => r.label === l)!)
    : rows.sort((a, b) => b.revenueCents - a.revenueCents || b.count - a.count);
}

export function buildMonthlyReport(
  appointments: ReportAppointment[],
  timezone: string,
  now: Date = new Date(),
): MonthlyReport {
  const active = appointments.filter((a) => a.status !== "canceled");
  const completed = active.filter((a) => a.status === "completed");
  const noShows = active.filter((a) => a.status === "no_show");
  const upcoming = active.filter((a) => a.status === "confirmed" && new Date(a.starts_at) > now);
  const sum = (l: ReportAppointment[]) => l.reduce((s, a) => s + a.price_cents, 0);
  const revenueCents = sum(completed);
  const attended = completed.length + noShows.length;

  const customers = new Map<
    string,
    { id: string; name: string; visits: number; revenueCents: number }
  >();
  for (const a of completed) {
    const c = customers.get(a.customer_id) ?? {
      id: a.customer_id,
      name: a.customer_name,
      visits: 0,
      revenueCents: 0,
    };
    c.visits++;
    c.revenueCents += a.price_cents;
    customers.set(a.customer_id, c);
  }

  const period = (a: ReportAppointment) => {
    const m = localMinutesOf(new Date(a.starts_at), timezone);
    return m < 12 * 60 ? "Manhã" : m < 18 * 60 ? "Tarde" : "Noite";
  };

  return {
    total: active.length,
    completed: completed.length,
    noShows: noShows.length,
    canceled: appointments.length - active.length,
    upcoming: upcoming.length,
    revenueCents,
    expectedCents: revenueCents + sum(active.filter((a) => a.status === "confirmed")),
    lostCents: sum(noShows),
    averageTicketCents: completed.length ? Math.round(revenueCents / completed.length) : 0,
    noShowRate: attended ? noShows.length / attended : 0,
    byService: group(active, (a) => a.service),
    byStaff: group(active, (a) => a.staff),
    byWeekday: group(
      active,
      (a) => WEEKDAYS[weekdayOf(toLocalDate(new Date(a.starts_at), timezone))],
      [...WEEKDAYS.slice(1), WEEKDAYS[0]],
    ),
    byPeriod: group(active, period, ["Manhã", "Tarde", "Noite"]),
    topCustomers: [...customers.values()]
      .sort((a, b) => b.revenueCents - a.revenueCents || b.visits - a.visits)
      .slice(0, 5),
  };
}

/** "2026-11" → primeiro dia do mês e do mês seguinte (datas locais). */
export function monthRange(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to: next };
}

export function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
