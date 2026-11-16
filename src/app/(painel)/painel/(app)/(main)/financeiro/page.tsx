import type { Metadata } from "next";
import Link from "next/link";
import { InicioTabs } from "@/components/painel/inicio-tabs";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Card } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { periodOf, todayIn, zonedDayRange } from "@/lib/dates";
import { summarizeMonth, type FinanceEntry } from "@/lib/finance/summary";
import { formatPrice } from "@/lib/money";
import { monthRange, shiftMonth } from "@/lib/reports/monthly";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EntryForm, EntryList } from "./entries";

export const metadata: Metadata = { title: "Financeiro — Calenvia" };

const MONTHS = [
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

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { business } = await requirePermission("finance.view");
  const tz = business.timezone;
  const current = periodOf(new Date(), tz);
  const sp = await searchParams;
  const period = sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : current;
  const { from, to } = monthRange(period);
  const supabase = await createSupabaseServerClient();
  const [{ data: appts }, { data: entries }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("business_id", business.id)
      .eq("status", "completed")
      .gte("starts_at", zonedDayRange(from, tz).start.toISOString())
      .lt("starts_at", zonedDayRange(to, tz).start.toISOString()),
    supabase
      .from("finance_entries")
      .select("id, kind, amount_cents, category, description, occurred_on")
      .eq("business_id", business.id)
      .gte("occurred_on", from)
      .lt("occurred_on", to)
      .order("occurred_on", { ascending: false }),
  ]);
  const list = (entries ?? []) as FinanceEntry[];
  // Valores só por appointment_prices() (finance.view, CAL-112).
  const prices = await loadAppointmentPrices(
    supabase,
    business.id,
    (appts ?? []).map((a) => a.id),
  );
  const s = summarizeMonth(
    [...prices.values()].reduce((t, v) => t + v, 0),
    list,
  );
  const [y, m] = period.split("-").map(Number);
  const defaultDate = period === current ? todayIn(tz) : from;

  return (
    <PageBody>
      <PageHeader
        title="Financeiro"
        description="Entradas dos atendimentos, outras receitas e despesas do mês."
      />
      <InicioTabs current="financeiro" />
      <nav aria-label="Mês" className="flex items-center justify-between gap-2">
        <Link
          href={`/financeiro?mes=${shiftMonth(period, -1)}`}
          aria-label="Mês anterior"
          className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold"
        >
          ‹
        </Link>
        <p className="font-display text-xl font-bold">
          {MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1)} de {y}
        </p>
        {period < current ? (
          <Link
            href={`/financeiro?mes=${shiftMonth(period, 1)}`}
            aria-label="Próximo mês"
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold"
          >
            ›
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </nav>

      <section aria-label="Resumo financeiro" className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted">Atendimentos concluídos</p>
          <p className="font-display text-lg font-bold">{formatPrice(s.appointmentsCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Outras receitas</p>
          <p className="font-display text-lg font-bold">{formatPrice(s.otherIncomeCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Despesas</p>
          <p className="font-display text-lg font-bold">− {formatPrice(s.expensesCents)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Saldo do mês</p>
          <p
            className={`font-display text-lg font-bold ${s.balanceCents < 0 ? "text-danger" : "text-success"}`}
          >
            {s.balanceCents < 0 ? "− " : ""}
            {formatPrice(Math.abs(s.balanceCents))}
          </p>
        </Card>
      </section>

      {s.expensesByCategory.length ? (
        <Card className="space-y-1 p-4 text-sm">
          <p className="font-semibold">Despesas por categoria</p>
          {s.expensesByCategory.map((c) => (
            <p key={c.category} className="flex justify-between">
              <span>{c.category}</span>
              <span className="text-ink-2">{formatPrice(c.cents)}</span>
            </p>
          ))}
        </Card>
      ) : null}

      <EntryForm defaultDate={defaultDate} />
      <EntryList entries={list} />
    </PageBody>
  );
}
