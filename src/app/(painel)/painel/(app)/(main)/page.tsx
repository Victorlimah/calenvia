import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart, HBarList, StatCard, formatPercent } from "@/components/painel/charts";
import { InicioTabs } from "@/components/painel/inicio-tabs";
import { PageHeader } from "@/components/painel/page-header";
import { QuotaAlert } from "@/components/painel/quota";
import { Badge, buttonClasses, EmptyState } from "@/components/ui";
import { loadAppointments } from "@/lib/agenda/load";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import { requireReadyMember } from "@/lib/business/current";
import { addLocalDays, formatTime, todayIn, zonedDayRange } from "@/lib/dates";
import { groupVisits, newVsReturning } from "@/lib/metrics-owner/customers";
import { loadCapacity } from "@/lib/metrics-owner/hours";
import { loadStats, loadVisits } from "@/lib/metrics-owner/load";
import {
  availableMinutes,
  breakdown,
  change,
  occupancy,
  previousRange,
  rangeOf,
  revenueSeries,
  totals,
} from "@/lib/metrics-owner/stats";
import { formatPrice } from "@/lib/money";
import { can } from "@/lib/permissions";
import { canSendAutomaticMessages } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthQuota } from "@/lib/whatsapp/quota";
import { ReturnSection } from "./_inicio/return-section";

export const metadata: Metadata = { title: "Início — Calenvia" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parâmetros da agenda antiga (que morava em "/"): links salvos continuam funcionando. */
const LEGACY_AGENDA_PARAMS = ["data", "profissional", "visao"];

export default async function InicioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const legacy = new URLSearchParams();
  for (const k of LEGACY_AGENDA_PARAMS) {
    const v = sp[k];
    if (typeof v === "string" && v) legacy.set(k, v);
  }
  if (legacy.size) redirect(`/agenda?${legacy.toString()}`);

  const member = await requireReadyMember();
  const { business } = member;
  const tz = business.timezone;
  const today = todayIn(tz);
  const finance = can(member, "finance.view");
  const seeAll = can(member, "appointments.view_all");
  const manage = can(member, "appointments.manage_all");
  const supabase = await createSupabaseServerClient();

  const day = rangeOf(today, "day");
  const week = rangeOf(today, "week");
  const month = rangeOf(today, "month");
  const prevDay = previousRange(day, "day");
  const prevWeek = previousRange(week, "week");
  const prevMonth = previousRange(month, "month");
  const last30 = { from: addLocalDays(today, -29), to: today };
  const loadRange = {
    from: [prevMonth.from, prevWeek.from, last30.from].sort()[0],
    to: [month.to, week.to].sort()[1],
  };

  const { start, end } = zonedDayRange(today, tz);
  const [rows, visits, capacity, services, todayList, quota] = await Promise.all([
    loadStats(supabase, business, loadRange),
    loadVisits(supabase, business.id),
    loadCapacity(supabase, business.id),
    supabase.from("services").select("id, name").eq("business_id", business.id),
    loadAppointments(supabase, business.id, { from: start, to: end }),
    canSendAutomaticMessages(business) && can(member, "settings.manage")
      ? getMonthQuota(supabase, business)
      : Promise.resolve(null),
  ]);

  const t = {
    day: totals(rows, day),
    prevDay: totals(rows, prevDay),
    week: totals(rows, week),
    prevWeek: totals(rows, prevWeek),
    month: totals(rows, month),
    prevMonth: totals(rows, prevMonth),
  };
  const customers = groupVisits(visits);
  const nr = newVsReturning(customers, month);
  const staffForCapacity = seeAll
    ? capacity.staff
    : capacity.staff.filter((s) => s.id === member.staffMemberId);
  const monthSoFar = { from: month.from, to: today };
  const occ = occupancy(
    totals(rows, monthSoFar).bookedMinutes,
    availableMinutes(monthSoFar, capacity.business, staffForCapacity),
  );
  const serviceNames = Object.fromEntries((services.data ?? []).map((s) => [s.id, s.name]));
  const byService = breakdown(rows, month, "service", serviceNames);
  const series = revenueSeries(rows, [], last30, "day");
  const isNew = rows.length === 0 && customers.length === 0;

  const now = new Date();
  const mineToday = todayList.filter(
    (a) => a.status !== "canceled" && (seeAll || a.staffId === member.staffMemberId),
  );
  const next = mineToday.filter((a) => a.status === "confirmed" && a.end > now).slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <PageHeader
        title="Início"
        description={seeAll ? business.name : `${business.name} · seus números`}
        action={
          manage ? (
            <div className="hidden gap-2 sm:flex">
              <Link
                href={`/registrar?data=${today}`}
                className={buttonClasses({ variant: "outline", size: "md" })}
              >
                Registrar
              </Link>
              <Link href={`/novo?data=${today}`} className={buttonClasses({ size: "md" })}>
                + Novo
              </Link>
            </div>
          ) : null
        }
      />
      {finance ? <InicioTabs current="resumo" /> : null}
      <QuotaAlert notice={quota?.notice ?? null} />

      {finance ? (
        <section aria-labelledby="faturamento" className="space-y-3">
          <h2 id="faturamento" className="font-display text-xl font-bold text-ink">
            Faturamento
          </h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard
              label="Hoje"
              value={formatPrice(t.day.revenueCents ?? 0)}
              delta={change(t.day.revenueCents, t.prevDay.revenueCents)}
            />
            <StatCard
              label="Esta semana"
              value={formatPrice(t.week.revenueCents ?? 0)}
              delta={change(t.week.revenueCents, t.prevWeek.revenueCents)}
            />
            <StatCard
              label="Este mês"
              value={formatPrice(t.month.revenueCents ?? 0)}
              delta={change(t.month.revenueCents, t.prevMonth.revenueCents)}
            />
            <StatCard
              label="Previsto no mês"
              value={formatPrice(t.month.expectedCents ?? 0)}
              hint="Concluídos + agendados"
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="hoje" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="hoje" className="font-display text-xl font-bold text-ink">
              Hoje
            </h2>
            <Link
              href="/agenda"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
            >
              Ver agenda
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Agendamentos" value={String(mineToday.length)} />
            <StatCard
              label="Concluídos"
              value={String(mineToday.filter((a) => a.status === "completed").length)}
            />
            <StatCard label="Pela frente" value={String(next.length)} />
          </div>
          {next.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-line bg-white px-5 py-4 text-ink-2">
              Nenhum atendimento pela frente hoje.
            </p>
          ) : (
            <ul
              aria-label="Próximos de hoje"
              className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white"
            >
              {next.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/agendamento/${a.id}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-paper-2"
                  >
                    <span className="w-12 font-semibold tabular-nums">
                      {formatTime(a.start, tz)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {a.customerName}
                      <span className="text-muted"> · {a.serviceName}</span>
                    </span>
                    <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="mes" className="space-y-3">
          <div className="flex min-h-11 items-center">
            <h2 id="mes" className="font-display text-xl font-bold text-ink">
              Este mês
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Atendimentos"
              value={String(t.month.appointments)}
              delta={change(t.month.appointments, t.prevMonth.appointments)}
            />
            <StatCard
              label="Taxa de falta"
              value={formatPercent(t.month.noShowRate)}
              hint={`${t.month.noShows} falta${t.month.noShows === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Ocupação da agenda"
              value={formatPercent(occ)}
              hint="Horas agendadas ÷ horas abertas"
            />
            <StatCard
              label="Clientes novos x voltaram"
              value={`${nr.new} · ${nr.returning}`}
              hint="Novos · que já tinham vindo"
            />
          </div>
        </section>
      </div>

      {isNew ? (
        <EmptyState
          title="Seus números aparecem aqui"
          description="Assim que você tiver atendimentos, os números aparecem aqui: faturamento, faltas, clientes que voltam e muito mais."
        />
      ) : (
        <div className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-white p-5 lg:grid-cols-2">
          {finance ? (
            <BarChart
              title="Faturamento nos últimos 30 dias"
              data={series.map((b) => ({
                key: b.key,
                label: b.label,
                value: b.revenueCents,
                display: formatPrice(b.revenueCents),
              }))}
              empty="Nenhum atendimento concluído nos últimos 30 dias."
            />
          ) : (
            <BarChart
              title="Atendimentos concluídos nos últimos 30 dias"
              data={series.map((b) => ({
                key: b.key,
                label: b.label,
                value: b.appointments,
                display: String(b.appointments),
              }))}
              empty="Nenhum atendimento concluído nos últimos 30 dias."
            />
          )}
          <HBarList
            title="Serviços mais feitos no mês"
            rows={byService.slice(0, 6).map((s) => ({
              key: s.id,
              label: s.label,
              value: finance ? s.revenueCents : s.appointments,
              display: finance ? formatPrice(s.revenueCents) : String(s.appointments),
              detail: finance ? `${s.appointments}×` : undefined,
            }))}
            empty="Nenhum atendimento concluído neste mês."
          />
        </div>
      )}

      <ReturnSection
        customers={customers}
        today={today}
        businessName={business.name}
        finance={finance}
      />
    </main>
  );
}
