import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addLocalDays, zonedDayRange, type LocalDate } from "@/lib/dates";
import type { Database } from "@/lib/supabase/types";
import type { VisitRecord } from "./customers";
import type { EntryRow, PaymentMethod, Range, StatRow } from "./stats";

type Client = SupabaseClient<Database>;

/**
 * Atendimentos agregados por dia no intervalo (datas locais, inclusivo). A função no banco
 * aplica as permissões: só os do próprio profissional sem `appointments.view_all` e valores
 * nulos sem `finance.view`.
 */
export async function loadStats(
  db: Client,
  business: { id: string; timezone: string },
  range: Range,
): Promise<StatRow[]> {
  const { data, error } = await db.rpc("appointment_stats", {
    p_business_id: business.id,
    p_from: zonedDayRange(range.from, business.timezone).start.toISOString(),
    p_to: zonedDayRange(range.to, business.timezone).end.toISOString(),
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    day: r.day,
    serviceId: r.service_id,
    staffId: r.staff_member_id,
    status: r.status as StatRow["status"],
    source: r.source as StatRow["source"],
    paymentMethod: (r.payment_method as PaymentMethod | null) ?? null,
    appointments: r.appointments,
    revenueCents: r.revenue_cents === null ? null : Number(r.revenue_cents),
    minutes: Number(r.minutes),
  }));
}

/** Entradas e despesas manuais (vazio para quem não vê o financeiro). */
export async function loadEntries(
  db: Client,
  businessId: string,
  range: Range,
): Promise<EntryRow[]> {
  const { data, error } = await db.rpc("finance_entry_stats", {
    p_business_id: businessId,
    p_from: range.from,
    p_to: addLocalDays(range.to, 1),
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    day: r.day,
    kind: r.kind as EntryRow["kind"],
    category: r.category,
    amountCents: Number(r.amount_cents),
  }));
}

/** Visitas concluídas de cada cliente (sem o cliente avulso). */
export async function loadVisits(db: Client, businessId: string): Promise<VisitRecord[]> {
  const { data, error } = await db.rpc("customer_visit_stats", { p_business_id: businessId });
  if (error) throw error;
  return (data ?? []).flatMap((c) =>
    (c.visit_days as LocalDate[]).map((day, i) => ({
      customerId: c.customer_id,
      name: c.name,
      whatsapp: c.whatsapp,
      optedOut: c.opted_out,
      day,
      status: "completed",
      priceCents: (c.visit_cents as (number | null)[])[i] ?? null,
    })),
  );
}
