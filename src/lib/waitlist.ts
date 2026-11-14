/** Lista de espera (CAL-104): texto do aviso e link direto para o dia. */
import { formatDate, formatWeekday, localDateToInstant } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";

export const PERIOD_OPTIONS = [
  { value: "any", label: "Qualquer horário" },
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noite" },
] as const;

export type WaitlistPeriod = (typeof PERIOD_OPTIONS)[number]["value"];

export function periodLabel(p: string): string {
  return PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? "Qualquer horário";
}

/** Link que leva o cliente direto aos horários do dia desejado. */
export function waitlistBookingLink(
  slug: string,
  e: { service_id: string; staff_member_id: string | null; desired_date: string },
): string {
  const q = new URLSearchParams({
    passo: "horario",
    servico: e.service_id,
    profissional: e.staff_member_id ?? "qualquer",
    data: e.desired_date,
  });
  return businessUrl(slug, `/agendar?${q}`);
}

export function waitlistMessage(
  b: { name: string; slug: string; timezone: string },
  e: {
    customer_name: string;
    service_id: string;
    staff_member_id: string | null;
    desired_date: string;
  },
  serviceName: string,
): string {
  const day = localDateToInstant(e.desired_date, b.timezone);
  const first = e.customer_name.trim().split(/\s+/)[0];
  return (
    `Olá, ${first}! Aqui é da *${b.name}*. Abriu um horário de *${serviceName}* ` +
    `para *${formatWeekday(day, b.timezone)}, ${formatDate(day, b.timezone).slice(0, 5)}*, ` +
    `o dia que você queria. Para garantir, agende aqui: ${waitlistBookingLink(b.slug, e)}`
  );
}
