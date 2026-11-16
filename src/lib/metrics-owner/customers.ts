/**
 * Retorno e ranking de clientes (CAL-123/124/125). Funções puras, testadas em customers.test.ts.
 *
 * Regras:
 * - Só atendimentos concluídos contam como visita (cancelados e faltas, não).
 * - Duas visitas no mesmo dia contam como uma (o intervalo entre visitas é em dias).
 * - O cliente avulso ("Sem WhatsApp", CAL-116) fica fora de tudo.
 */
import { diffLocalDays, type LocalDate } from "@/lib/dates";
import { WALK_IN_PHONE } from "@/lib/phone";
import { inRange, type Range } from "./stats";

export type VisitRecord = {
  customerId: string;
  name: string;
  whatsapp: string;
  optedOut?: boolean;
  day: LocalDate;
  status: string;
  /** null = o papel não vê valores. */
  priceCents: number | null;
};

export type CustomerVisits = {
  id: string;
  name: string;
  whatsapp: string;
  optedOut: boolean;
  /** Dias com visita, sem repetir, em ordem. */
  days: LocalDate[];
  /** Cada visita (atendimento) com o dia e o valor. */
  visits: { day: LocalDate; priceCents: number | null }[];
};

export function groupVisits(records: VisitRecord[]): CustomerVisits[] {
  const map = new Map<string, CustomerVisits>();
  for (const r of records) {
    if (r.status !== "completed" || r.whatsapp === WALK_IN_PHONE) continue;
    const c = map.get(r.customerId) ?? {
      id: r.customerId,
      name: r.name,
      whatsapp: r.whatsapp,
      optedOut: Boolean(r.optedOut),
      days: [],
      visits: [],
    };
    c.visits.push({ day: r.day, priceCents: r.priceCents });
    map.set(r.customerId, c);
  }
  for (const c of map.values()) {
    c.visits.sort((a, b) => a.day.localeCompare(b.day));
    c.days = [...new Set(c.visits.map((v) => v.day))];
  }
  return [...map.values()];
}

/** Intervalos (em dias) entre uma visita e a próxima. */
export function gaps(days: LocalDate[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < days.length; i++) out.push(diffLocalDays(days[i - 1], days[i]));
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Tempo médio entre visitas de um cliente (null com uma visita só). */
export function customerAverageGap(c: CustomerVisits): number | null {
  return mean(gaps(c.days));
}

/** Tempo médio entre visitas de todos os clientes (média de todos os intervalos). */
export function overallAverageGap(customers: CustomerVisits[]): number | null {
  return mean(customers.flatMap((c) => gaps(c.days)));
}

/**
 * Taxa de retorno em N dias: dos clientes cuja primeira visita foi há pelo menos N dias, quantos
 * voltaram em até N dias depois dela. `eligible` = quantos entraram na conta.
 */
export function returnRate(
  customers: CustomerVisits[],
  windowDays: number,
  today: LocalDate,
): { rate: number | null; eligible: number; returned: number } {
  let eligible = 0;
  let returned = 0;
  for (const c of customers) {
    const first = c.days[0];
    if (!first || diffLocalDays(first, today) < windowDays) continue;
    eligible++;
    if (c.days.length > 1 && diffLocalDays(first, c.days[1]) <= windowDays) returned++;
  }
  return { rate: eligible ? returned / eligible : null, eligible, returned };
}

export type MissingCustomer = {
  id: string;
  name: string;
  whatsapp: string;
  optedOut: boolean;
  lastVisit: LocalDate;
  averageGap: number;
  daysSince: number;
  /** Quantos dias passou do tempo médio dele. */
  overdueBy: number;
};

/**
 * Clientes sumidos: já passaram do tempo médio deles entre visitas sem voltar. Precisa de pelo
 * menos 2 visitas (com uma só não dá para saber o ritmo do cliente). Mais atrasados primeiro.
 */
export function missingCustomers(customers: CustomerVisits[], today: LocalDate): MissingCustomer[] {
  const out: MissingCustomer[] = [];
  for (const c of customers) {
    const avg = customerAverageGap(c);
    if (avg === null || avg <= 0) continue;
    const lastVisit = c.days[c.days.length - 1];
    const daysSince = diffLocalDays(lastVisit, today);
    const averageGap = Math.round(avg);
    if (daysSince > averageGap) {
      out.push({
        id: c.id,
        name: c.name,
        whatsapp: c.whatsapp,
        optedOut: c.optedOut,
        lastVisit,
        averageGap,
        daysSince,
        overdueBy: daysSince - averageGap,
      });
    }
  }
  return out.sort((a, b) => b.overdueBy - a.overdueBy || a.name.localeCompare(b.name));
}

/** Clientes atendidos no intervalo: novos (1ª visita no intervalo) x que voltaram. */
export function newVsReturning(customers: CustomerVisits[], range: Range) {
  let fresh = 0;
  let returning = 0;
  for (const c of customers) {
    if (!c.days.some((d) => inRange(d, range))) continue;
    if (c.days[0] >= range.from) fresh++;
    else returning++;
  }
  return { new: fresh, returning };
}

export type RankingRow = {
  id: string;
  name: string;
  visits: number;
  /** null = o papel não vê valores. */
  spentCents: number | null;
};

/**
 * Ranking (CAL-125): mais frequentes (visitas = dias com atendimento) ou que mais gastam,
 * contando só o que aconteceu desde `since` (null = sempre).
 */
export function ranking(
  customers: CustomerVisits[],
  by: "visits" | "spent",
  since: LocalDate | null,
  limit = 10,
): RankingRow[] {
  const rows: RankingRow[] = [];
  for (const c of customers) {
    const visits = c.visits.filter((v) => !since || v.day >= since);
    if (!visits.length) continue;
    const hidden = visits.some((v) => v.priceCents === null);
    rows.push({
      id: c.id,
      name: c.name,
      visits: new Set(visits.map((v) => v.day)).size,
      spentCents: hidden ? null : visits.reduce((s, v) => s + (v.priceCents ?? 0), 0),
    });
  }
  const key = (r: RankingRow) => (by === "visits" ? r.visits : (r.spentCents ?? 0));
  return rows
    .sort(
      (a, b) =>
        key(b) - key(a) ||
        (by === "visits" ? (b.spentCents ?? 0) - (a.spentCents ?? 0) : b.visits - a.visits) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

/** Mensagem pronta para chamar um cliente sumido pelo WhatsApp (sem envio automático). */
export function comeBackMessage(customerName: string, businessName: string): string {
  const first = customerName.trim().split(/\s+/)[0] || customerName;
  return `Olá, ${first}! Aqui é da ${businessName}. Faz um tempinho que você não vem, sentimos sua falta! Quer agendar um horário?`;
}
