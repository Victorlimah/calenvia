import type { Metadata } from "next";
import Link from "next/link";
import { Timeline } from "@/components/painel/agenda/timeline";
import { buttonClasses } from "@/components/ui";
import { loadAgendaDay, loadAppointments } from "@/lib/agenda/load";
import { buildTimeline, daySummary } from "@/lib/agenda/timeline";
import { requireReadyBusiness } from "@/lib/business/current";
import {
  addLocalDays,
  formatDayLabel,
  isLocalDate,
  localDateToInstant,
  todayIn,
  weekdayOf,
  zonedDayRange,
} from "@/lib/dates";
import { DatePicker } from "@/components/painel/agenda/date-picker";
import { StaffChips } from "@/components/painel/agenda/staff-chips";
import { WeekView } from "@/components/painel/agenda/week-view";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuotaAlert } from "@/components/painel/quota";
import { RealtimeRefresh } from "@/components/painel/agenda/realtime-refresh";
import { canSendAutomaticMessages } from "@/lib/plans";
import { getMonthQuota } from "@/lib/whatsapp/quota";

export const metadata: Metadata = { title: "Agenda — Calenvia" };

type Props = { searchParams: Promise<{ data?: string; profissional?: string; visao?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const business = await requireReadyBusiness();
  const sp = await searchParams;
  const tz = business.timezone;
  const today = todayIn(tz);
  const date = sp.data && isLocalDate(sp.data) ? sp.data : today;
  const supabase = await createSupabaseServerClient();
  const { ctx, appointments, blocks } = await loadAgendaDay(supabase, business, date);
  const staffId =
    sp.profissional && ctx.staff.some((s) => s.id === sp.profissional) ? sp.profissional : null;
  const staffNames = Object.fromEntries(ctx.staff.map((s) => [s.id, s.name]));
  const { items, canceled, dayStatus } = buildTimeline({
    ctx,
    date,
    staffId,
    appointments,
    blocks,
  });
  const summary = daySummary(appointments.filter((a) => !staffId || a.staffId === staffId));
  const label = formatDayLabel(localDateToInstant(date, tz), tz);
  const week = sp.visao === "semana";
  const staffQuery = staffId ? `&profissional=${staffId}` : "";
  const q = (d: string, w = week) => `/?data=${d}${staffQuery}${w ? "&visao=semana" : ""}`;
  const weekStart = addLocalDays(date, -((weekdayOf(date) + 6) % 7)); // segunda-feira
  const weekDays = Array.from({ length: 7 }, (_, i) => addLocalDays(weekStart, i));
  const weekAppointments = week
    ? (
        await loadAppointments(supabase, business.id, {
          from: zonedDayRange(weekDays[0], tz).start,
          to: zonedDayRange(weekDays[6], tz).end,
        })
      ).filter((a) => !staffId || a.staffId === staffId)
    : [];

  const quota = canSendAutomaticMessages(business) ? await getMonthQuota(supabase, business) : null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-6 pb-10 md:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Agenda</h1>
          <p className="mt-0.5 text-ink-2 first-letter:uppercase">
            {date === today ? `Hoje, ${label}` : label}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/bloquear?data=${date}`}
            className={buttonClasses({ variant: "outline", size: "md" })}
          >
            Bloquear
          </Link>
          <Link href={`/novo?data=${date}`} className={buttonClasses({ size: "md" })}>
            + Novo
          </Link>
        </div>
      </header>

      <RealtimeRefresh businessId={business.id} />
      <QuotaAlert notice={quota?.notice ?? null} />

      <nav aria-label="Navegar entre dias" className="flex items-center gap-2">
        <Link
          href={q(addLocalDays(date, -1))}
          aria-label="Dia anterior"
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ‹
        </Link>
        {date !== today ? (
          <Link href={q(today)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Hoje
          </Link>
        ) : null}
        <Link
          href={q(addLocalDays(date, 1))}
          aria-label="Próximo dia"
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ›
        </Link>
        <DatePicker value={date} extraQuery={staffQuery} />
        <div
          className="ml-auto inline-flex rounded-[var(--radius-control)] border border-line bg-white p-1"
          role="group"
          aria-label="Visão"
        >
          <Link
            href={q(date, false)}
            aria-current={!week ? "true" : undefined}
            className={`inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold ${!week ? "bg-ink text-white" : "text-ink-2"}`}
          >
            Dia
          </Link>
          <Link
            href={q(date, true)}
            aria-current={week ? "true" : undefined}
            className={`inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold ${week ? "bg-ink text-white" : "text-ink-2"}`}
          >
            Semana
          </Link>
        </div>
      </nav>

      <StaffChips
        staff={ctx.staff}
        selected={staffId}
        hrefFor={(id) =>
          `/?data=${date}${id ? `&profissional=${id}` : ""}${week ? "&visao=semana" : ""}`
        }
      />

      {week ? (
        <WeekView
          days={weekDays}
          appointments={weekAppointments}
          timezone={tz}
          today={today}
          staffQuery={staffQuery}
        />
      ) : (
        <>
          <section aria-label="Resumo do dia" className="grid grid-cols-3 gap-2">
            <Stat label="Agendamentos" value={String(summary.total)} />
            <Stat label="Livres" value={String(items.filter((i) => i.kind === "free").length)} />
            <Stat label="Previsto" value={formatPrice(summary.expectedRevenueCents)} />
          </section>

          <Timeline
            items={items}
            canceled={canceled}
            timezone={tz}
            date={date}
            dayStatus={dayStatus}
            staffNames={staffNames}
            showStaff={!staffId && ctx.staff.length > 1}
          />
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-3 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
