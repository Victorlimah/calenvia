import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart, HBarList, StatCard } from "@/components/painel/charts";
import { requirePermission } from "@/lib/business/current";
import { cn } from "@/lib/cn";
import { todayIn } from "@/lib/dates";
import { loadEntries, loadStats } from "@/lib/metrics-owner/load";
import { parsePeriod, PERIOD_KINDS, shiftPeriod, type Period } from "@/lib/metrics-owner/period";
import {
  autoGranularity,
  breakdown,
  cashSummary,
  change,
  paymentBreakdown,
  previousRange,
  revenueSeries,
  totals,
} from "@/lib/metrics-owner/stats";
import { formatPrice } from "@/lib/money";
import { hasFeature } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Financeiro — Calenvia" };

type Props = {
  searchParams: Promise<{
    mes?: string;
    periodo?: string;
    data?: string;
    de?: string;
    ate?: string;
  }>;
};

/** Resumo do Financeiro (CAL-126/127): faturamento por período, despesas, saldo e gráficos. */
export default async function FinanceiroResumoPage({ searchParams }: Props) {
  const sp = await searchParams;
  // Endereço antigo (/financeiro?mes=AAAA-MM) era a tela de lançamentos.
  if (sp.mes) redirect(`/financeiro/lancamentos?mes=${encodeURIComponent(sp.mes)}`);

  const { business } = await requirePermission("finance.view");
  const tz = business.timezone;
  const today = todayIn(tz);
  const period = parsePeriod(sp, today);
  const compare = hasFeature(business, "reports");
  const prev = previousRange(period.range, period.compareAs);
  const loadRange = { from: prev.from, to: period.range.to };
  const supabase = await createSupabaseServerClient();
  const [rows, entries, services, staff] = await Promise.all([
    loadStats(supabase, business, loadRange),
    loadEntries(supabase, business.id, loadRange),
    supabase.from("services").select("id, name").eq("business_id", business.id),
    supabase.from("staff_members").select("id, name").eq("business_id", business.id),
  ]);
  const cur = totals(rows, period.range);
  const before = totals(rows, prev);
  const cash = cashSummary(rows, entries, period.range);
  const cashBefore = cashSummary(rows, entries, prev);
  const by = autoGranularity(period.range);
  const series = revenueSeries(rows, entries, period.range, by);
  const names = (list: { id: string; name: string }[] | null) =>
    Object.fromEntries((list ?? []).map((x) => [x.id, x.name]));
  const byService = breakdown(rows, period.range, "service", names(services.data));
  const byStaff = breakdown(rows, period.range, "staff", names(staff.data));
  const payments = paymentBreakdown(rows, period.range);
  const delta = (a: number | null, b: number | null) => (compare ? change(a, b) : undefined);

  return (
    <div className="space-y-6">
      <PeriodPicker period={period} />

      <section aria-label="Resumo do período" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Faturamento"
          value={formatPrice(cash.incomeCents)}
          delta={delta(cash.incomeCents, cashBefore.incomeCents)}
          hint="Atendimentos + outras receitas"
        />
        <StatCard
          label="Despesas"
          value={formatPrice(cash.expensesCents)}
          delta={delta(cash.expensesCents, cashBefore.expensesCents)}
          goodWhenUp={false}
        />
        <StatCard
          label="Saldo"
          value={`${cash.balanceCents < 0 ? "− " : ""}${formatPrice(Math.abs(cash.balanceCents))}`}
          delta={delta(cash.balanceCents, cashBefore.balanceCents)}
        />
        <StatCard
          label="Ticket médio"
          value={formatPrice(cur.averageTicketCents ?? 0)}
          delta={delta(cur.averageTicketCents, before.averageTicketCents)}
          hint={`${cur.completed} atendimento${cur.completed === 1 ? "" : "s"} concluído${cur.completed === 1 ? "" : "s"}`}
        />
      </section>
      {!compare ? (
        <p className="text-sm text-muted">
          A comparação com o período anterior e a exportação fazem parte do plano Pro+.{" "}
          <Link href="/assinatura" className="font-semibold text-brand underline">
            Ver planos
          </Link>
        </p>
      ) : null}

      <div className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-white p-5 lg:grid-cols-2">
        <BarChart
          className="lg:col-span-2"
          title={`Faturamento por ${by === "day" ? "dia" : by === "week" ? "semana" : "mês"}`}
          data={series.map((b) => ({
            key: b.key,
            label: b.label,
            value: b.revenueCents,
            display: formatPrice(b.revenueCents),
          }))}
          empty="Nenhuma entrada neste período."
        />
        <HBarList
          title="Por serviço"
          rows={byService.map((s) => ({
            key: s.id,
            label: s.label,
            value: s.revenueCents,
            display: formatPrice(s.revenueCents),
            detail: `${s.appointments}×`,
          }))}
          empty="Nenhum atendimento concluído."
        />
        <HBarList
          title="Por profissional"
          rows={byStaff.map((s) => ({
            key: s.id,
            label: s.label,
            value: s.revenueCents,
            display: formatPrice(s.revenueCents),
            detail: `${s.appointments}×`,
          }))}
          empty="Nenhum atendimento concluído."
        />
      </div>

      <section
        aria-labelledby="caixa"
        className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-5"
      >
        <h2 id="caixa" className="font-display text-xl font-bold text-ink">
          Caixa por forma de pagamento
        </h2>
        <p className="text-sm text-ink-2">
          Atendimentos concluídos no período, pela forma de pagamento marcada ao concluir ou
          registrar.
        </p>
        {payments.length === 0 ? (
          <p className="text-sm text-muted">Nenhum atendimento concluído neste período.</p>
        ) : (
          <ul aria-label="Caixa por forma de pagamento" className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.method ?? "none"} className="flex items-center justify-between py-2">
                <span className={cn(!p.method && "text-muted")}>
                  {p.label}
                  <span className="text-sm text-muted"> · {p.appointments}×</span>
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(p.revenueCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PeriodPicker({ period }: { period: Period }) {
  const href = (q: Record<string, string>) => `/financeiro?${new URLSearchParams(q).toString()}`;
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:border-ink",
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {PERIOD_KINDS.map((k) => (
          <Link
            key={k.key}
            href={
              k.key === "personalizado"
                ? href({ periodo: "personalizado", de: period.range.from, ate: period.range.to })
                : href({ periodo: k.key, data: period.anchor })
            }
            aria-current={period.kind === k.key ? "true" : undefined}
            className={chip(period.kind === k.key)}
          >
            {k.label}
          </Link>
        ))}
      </div>
      {period.kind === "personalizado" ? (
        <form className="flex flex-wrap items-end gap-2" action="/financeiro">
          <input type="hidden" name="periodo" value="personalizado" />
          <label className="text-sm font-semibold">
            De
            <input
              type="date"
              name="de"
              defaultValue={period.range.from}
              className="mt-1 block min-h-11 rounded-[var(--radius-control)] border border-line bg-white px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Até
            <input
              type="date"
              name="ate"
              defaultValue={period.range.to}
              className="mt-1 block min-h-11 rounded-[var(--radius-control)] border border-line bg-white px-3"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-[var(--radius-control)] bg-ink px-4 font-semibold text-white"
          >
            Ver
          </button>
        </form>
      ) : (
        <nav aria-label="Navegar no período" className="flex items-center gap-2">
          <Link
            href={href({ periodo: period.kind, data: shiftPeriod(period, -1) })}
            aria-label="Período anterior"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-white font-semibold"
          >
            ‹
          </Link>
          <p className="min-w-0 flex-1 text-center font-display text-lg font-bold first-letter:uppercase">
            {period.label}
          </p>
          <Link
            href={href({ periodo: period.kind, data: shiftPeriod(period, 1) })}
            aria-label="Próximo período"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-white font-semibold"
          >
            ›
          </Link>
        </nav>
      )}
    </div>
  );
}
