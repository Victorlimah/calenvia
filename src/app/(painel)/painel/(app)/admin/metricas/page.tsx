import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { PLAN_STATUS_LABELS, PLAN_STATUSES } from "@/lib/admin/business-update";
import { formatAdminDate } from "@/lib/admin/format";
import {
  type CountsByPlanStatus,
  estimatedMrrCents,
  FUNNEL_LABELS,
  FUNNEL_PERIODS,
  formatRate,
  funnelRates,
  parseFunnelPeriod,
  planTotal,
} from "@/lib/admin/metrics";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/money";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../ui";

export const metadata: Metadata = { title: "Métricas — Administração Calenvia" };

type Week = { week: string; total: number };

const MESSAGE_STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  sent: "Enviadas",
  delivered: "Entregues",
  read: "Lidas",
  failed: "Com falha",
  skipped: "Não enviadas",
};

export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const days = parseFunnelPeriod((await searchParams).dias);
  const db = createSupabaseAdminClient();
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const [overview, funnel] = await Promise.all([
    db.rpc("admin_metrics_overview").single(),
    db.rpc("metrics_funnel", { p_from: from.toISOString(), p_to: now.toISOString() }),
  ]);

  if (overview.error || !overview.data) {
    return (
      <AdminBody>
        <AdminTitle title="Métricas" />
        <EmptyState title="Não foi possível carregar" description="Recarregue a página." />
      </AdminBody>
    );
  }

  const o = overview.data;
  const counts = (o.by_plan_status ?? {}) as CountsByPlanStatus;
  const mrr = estimatedMrrCents(counts);
  const weeks = (o.new_businesses_by_week ?? []) as Week[];
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));
  const msgStatus = (o.messages_by_status ?? {}) as Record<string, number>;
  const appts = (o.appointments_last_30d ?? {}) as Record<string, number>;
  const steps = funnelRates(
    (funnel.data ?? []).map((s) => ({ step: s.step, total: Number(s.total) })),
  );
  const maxStep = Math.max(1, ...steps.map((s) => s.total));
  const usedStatuses = PLAN_STATUSES.filter((st) =>
    PLAN_ORDER.some((p) => (counts[p]?.[st] ?? 0) > 0),
  );

  return (
    <AdminBody>
      <AdminTitle
        title="Métricas"
        description={`${o.businesses_total} negócios cadastrados, ${o.onboarding_completed_total} com onboarding concluído.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Negócios ativos" value={String(mrr.activeBusinesses)} />
        <Stat
          label="Receita mensal estimada"
          value={formatPrice(mrr.activeCents)}
          hint="Estimativa pelo preço de tabela, não considera valores combinados por fora."
        />
        <Stat
          label="Em risco (pagamento atrasado)"
          value={formatPrice(mrr.atRiskCents)}
          hint={`${mrr.atRiskBusinesses} ${mrr.atRiskBusinesses === 1 ? "negócio" : "negócios"}`}
        />
        <Stat
          label="Mensagens no mês"
          value={String(o.messages_this_month)}
          hint={
            Object.entries(msgStatus)
              .map(([k, n]) => `${MESSAGE_STATUS_LABELS[k] ?? k}: ${n}`)
              .join(" · ") || "Nenhuma mensagem registrada"
          }
        />
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink">Funil</h2>
          <nav aria-label="Período do funil" className="flex gap-1">
            {FUNNEL_PERIODS.map((d) => (
              <Link
                key={d}
                href={d === 30 ? "/admin/metricas" : `/admin/metricas?dias=${d}`}
                aria-current={d === days ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold",
                  d === days ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2",
                )}
              >
                {d} dias
              </Link>
            ))}
          </nav>
        </div>
        {funnel.error ? (
          <p className="text-sm text-danger">Não foi possível carregar o funil.</p>
        ) : (
          <ol className="space-y-3" aria-label={`Funil dos últimos ${days} dias`}>
            {steps.map((s) => (
              <li key={s.step} className="space-y-1">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-semibold text-ink">{FUNNEL_LABELS[s.step] ?? s.step}</span>
                  <span className="text-ink-2">
                    <strong className="text-ink">{s.total}</strong>
                    {s.fromPrevious !== null || s.fromFirst !== null
                      ? ` · ${formatRate(s.fromPrevious)} do passo anterior · ${formatRate(s.fromFirst)} do início`
                      : null}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-paper-2" aria-hidden="true">
                  <div
                    className="h-3 rounded-full bg-brand"
                    style={{ width: `${(s.total / maxStep) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">Negócios por plano</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Plano
                  </th>
                  {usedStatuses.map((st) => (
                    <th key={st} scope="col" className="py-2 pr-3 text-right font-medium">
                      {PLAN_STATUS_LABELS[st]}
                    </th>
                  ))}
                  <th scope="col" className="py-2 text-right font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PLAN_ORDER.map((p) => (
                  <tr key={p}>
                    <th scope="row" className="py-2 pr-3 text-left font-semibold text-ink">
                      {PLANS[p].name}
                    </th>
                    {usedStatuses.map((st) => (
                      <td key={st} className="py-2 pr-3 text-right text-ink-2">
                        {counts[p]?.[st] ?? 0}
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold text-ink">
                      {planTotal(counts, p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">
            Agendamentos nos últimos 30 dias: {appts.link ?? 0} pelo link e {appts.manual ?? 0}{" "}
            manuais.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">Novos negócios por semana</h2>
          <div className="flex h-40 items-end gap-1" role="list" aria-label="Últimas 12 semanas">
            {weeks.map((w) => (
              <div
                key={w.week}
                role="listitem"
                aria-label={`Semana de ${formatWeek(w.week)}: ${w.total}`}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <div
                  className="min-h-0.5 rounded-t bg-brand"
                  style={{ height: `${(w.total / maxWeek) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <table className="sr-only">
            <caption>Novos negócios por semana</caption>
            <thead>
              <tr>
                <th scope="col">Semana</th>
                <th scope="col">Novos negócios</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week}>
                  <td>{formatWeek(w.week)}</td>
                  <td>{w.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="flex justify-between text-xs text-muted" aria-hidden="true">
            <span>{weeks[0] ? formatWeek(weeks[0].week) : ""}</span>
            <span>{weeks.at(-1) ? formatWeek(weeks.at(-1)!.week) : ""}</span>
          </p>
        </Card>
      </div>
    </AdminBody>
  );
}

/** "2026-11-09" → "09/11/2026" (a data já é a segunda-feira no horário de Brasília). */
function formatWeek(week: string): string {
  return formatAdminDate(`${week}T12:00:00-03:00`);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="space-y-1">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
