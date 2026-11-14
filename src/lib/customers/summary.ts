/** Lista de clientes (CAL-063): ordenação e textos de resumo. */
import { formatDate } from "@/lib/dates";
import { formatPrice } from "@/lib/money";

export type CustomerSummary = {
  id: string;
  name: string;
  whatsapp: string;
  visits: number;
  no_shows: number;
  upcoming: number;
  total_spent_cents: number;
  last_visit_at: string | null;
  opted_out_at: string | null;
};

export const CUSTOMER_SORTS = {
  recentes: { label: "Visita mais recente", column: "last_appointment_at", ascending: false },
  nome: { label: "Nome (A–Z)", column: "name", ascending: true },
  visitas: { label: "Mais visitas", column: "visits", ascending: false },
  gasto: { label: "Maior gasto", column: "total_spent_cents", ascending: false },
  faltas: { label: "Mais faltas", column: "no_shows", ascending: false },
} as const;

export type CustomerSort = keyof typeof CUSTOMER_SORTS;

export function parseCustomerSort(value: string | undefined): CustomerSort {
  return value && value in CUSTOMER_SORTS ? (value as CustomerSort) : "recentes";
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "3 visitas · 1 falta · última em 12/10/2026 · R$ 120,00" */
export function customerStatsLine(c: CustomerSummary, timezone: string): string {
  const parts = [plural(c.visits, "visita", "visitas")];
  if (c.no_shows) parts.push(plural(c.no_shows, "falta", "faltas"));
  if (c.last_visit_at) parts.push(`última em ${formatDate(new Date(c.last_visit_at), timezone)}`);
  if (c.total_spent_cents) parts.push(formatPrice(c.total_spent_cents));
  return parts.join(" · ");
}

/** Sinal para o dono: cliente que falta muito. */
export function isFrequentNoShow(c: Pick<CustomerSummary, "visits" | "no_shows">): boolean {
  return c.no_shows >= 2 && c.no_shows >= c.visits;
}
