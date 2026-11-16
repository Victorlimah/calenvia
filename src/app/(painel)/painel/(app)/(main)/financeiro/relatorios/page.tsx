import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader, TabBody } from "@/components/painel/page-header";
import { Card, EmptyState } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { periodOf, zonedDayRange } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { hasFeature } from "@/lib/plans";
import { buildMonthlyReport, monthRange, shiftMonth, type Breakdown } from "@/lib/reports/monthly";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Relatórios — Calenvia" };

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

function monthLabel(period: string) {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { business } = await requirePermission("finance.view");
  const tz = business.timezone;
  const current = periodOf(new Date(), tz);
  const sp = await searchParams;
  const period = sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : current;

  if (!hasFeature(business, "reports")) {
    return (
      <TabBody>
        <SectionHeader title="Relatórios" back={{ href: "/financeiro", label: "Financeiro" }} />
        <EmptyState
          title="Relatórios fazem parte do plano Pro+"
          description="Faturamento do mês, faltas, serviços que mais vendem e melhores clientes."
          action={
            <Link href="/assinatura" className="font-semibold text-brand underline">
              Ver o plano Pro+
            </Link>
          }
        />
      </TabBody>
    );
  }

  const { from, to } = monthRange(period);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, customer_id, customer_name, services(name), staff_members(name)",
    )
    .eq("business_id", business.id)
    .gte("starts_at", zonedDayRange(from, tz).start.toISOString())
    .lt("starts_at", zonedDayRange(to, tz).start.toISOString());
  const prices = await loadAppointmentPrices(
    supabase,
    business.id,
    (data ?? []).map((a) => a.id),
  );
  const report = buildMonthlyReport(
    (data ?? []).map((a) => ({
      starts_at: a.starts_at,
      status: a.status,
      price_cents: prices.get(a.id) ?? 0,
      customer_id: a.customer_id,
      customer_name: a.customer_name,
      service: a.services?.name ?? "—",
      staff: a.staff_members?.name ?? "—",
    })),
    tz,
  );

  return (
    <TabBody>
      <SectionHeader title="Relatórios" description="Faturamento e faltas do mês." />
      <nav aria-label="Mês" className="flex items-center justify-between gap-2">
        <Link
          href={`/financeiro/relatorios?mes=${shiftMonth(period, -1)}`}
          className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold"
          aria-label="Mês anterior"
        >
          ‹
        </Link>
        <p className="font-display text-xl font-bold first-letter:uppercase">
          {monthLabel(period)}
        </p>
        {period < current ? (
          <Link
            href={`/financeiro/relatorios?mes=${shiftMonth(period, 1)}`}
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold"
            aria-label="Próximo mês"
          >
            ›
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </nav>

      {error ? (
        <EmptyState title="Não foi possível carregar" description="Atualize a página." />
      ) : report.total === 0 && report.canceled === 0 ? (
        <EmptyState
          title="Nenhum agendamento neste mês"
          description="Os números aparecem aqui conforme os atendimentos acontecem."
        />
      ) : (
        <>
          <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label="Faturado"
              value={formatPrice(report.revenueCents)}
              hint="atendimentos concluídos"
            />
            <Stat
              label="Previsto"
              value={formatPrice(report.expectedCents)}
              hint="concluídos + marcados"
            />
            <Stat label="Ticket médio" value={formatPrice(report.averageTicketCents)} />
            <Stat
              label="Faltas"
              value={`${report.noShows} (${Math.round(report.noShowRate * 100)}%)`}
              hint={report.lostCents ? `${formatPrice(report.lostCents)} perdidos` : undefined}
            />
          </section>
          <Card className="grid grid-cols-3 gap-2 p-4 text-center text-sm">
            <p>
              <strong className="block text-lg">{report.completed}</strong> concluídos
            </p>
            <p>
              <strong className="block text-lg">{report.upcoming}</strong> a acontecer
            </p>
            <p>
              <strong className="block text-lg">{report.canceled}</strong> cancelados
            </p>
          </Card>
          <Bars title="Por serviço" rows={report.byService} />
          <Bars title="Por profissional" rows={report.byStaff} />
          <Bars title="Por dia da semana" rows={report.byWeekday} byCount />
          <Bars title="Por período" rows={report.byPeriod} byCount />
          {report.topCustomers.length ? (
            <section aria-labelledby="top" className="space-y-2">
              <h2 id="top" className="font-display text-lg font-bold">
                Melhores clientes
              </h2>
              <Card className="divide-y divide-line p-0">
                {report.topCustomers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-2"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm text-ink-2">
                      {c.visits} {c.visits === 1 ? "visita" : "visitas"} ·{" "}
                      {formatPrice(c.revenueCents)}
                    </span>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}
        </>
      )}
    </TabBody>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      {hint ? <p className="text-xs text-ink-2">{hint}</p> : null}
    </Card>
  );
}

function Bars({
  title,
  rows,
  byCount = false,
}: {
  title: string;
  rows: Breakdown;
  byCount?: boolean;
}) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => (byCount ? r.count : r.revenueCents)), 1);
  return (
    <section aria-label={title} className="space-y-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <Card className="space-y-3 p-4">
        {rows.map((r) => {
          const v = byCount ? r.count : r.revenueCents;
          return (
            <div key={r.label}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="font-semibold">{r.label}</span>
                <span className="text-ink-2">
                  {r.count} {r.count === 1 ? "agendamento" : "agendamentos"}
                  {byCount ? "" : ` · ${formatPrice(r.revenueCents)}`}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper-2" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
