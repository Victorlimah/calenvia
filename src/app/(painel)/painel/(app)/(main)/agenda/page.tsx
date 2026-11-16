import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Timeline } from "@/components/painel/agenda/timeline";
import { buttonClasses } from "@/components/ui";
import { loadAgendaDay, loadAppointments } from "@/lib/agenda/load";
import { buildTimeline, daySummary } from "@/lib/agenda/timeline";
import {
  AGENDA_VIEW_COOKIE,
  AGENDA_VIEWS,
  agendaHref,
  monthLabel,
  parseView,
  shiftDate,
  visibleRange,
  weekDaysOf,
  weekLabel,
  type AgendaState,
  type AgendaView,
} from "@/lib/agenda/view";
import { requireReadyMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import {
  formatDayLabel,
  isLocalDate,
  localDateToInstant,
  todayIn,
  zonedDayRange,
} from "@/lib/dates";
import { DatePicker } from "@/components/painel/agenda/date-picker";
import { StaffChips } from "@/components/painel/agenda/staff-chips";
import { DesktopDefaultView, ViewSwitcher } from "@/components/painel/agenda/view-switcher";
import { WeekView } from "@/components/painel/agenda/week-view";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuotaAlert } from "@/components/painel/quota";
import { RealtimeRefresh } from "@/components/painel/agenda/realtime-refresh";
import { WaitlistSection, type WaitlistItem } from "@/components/painel/agenda/waitlist-section";
import { waMeLink } from "@/lib/phone";
import { periodLabel, waitlistMessage } from "@/lib/waitlist";
import { canSendAutomaticMessages } from "@/lib/plans";
import { getMonthQuota } from "@/lib/whatsapp/quota";

export const metadata: Metadata = { title: "Agenda — Calenvia" };

type Props = { searchParams: Promise<{ data?: string; profissional?: string; visao?: string }> };

/** Visões disponíveis nesta versão da agenda. */
const ENABLED_VIEWS: AgendaView[] = ["lista", "semana"];

const PREV_LABEL: Record<AgendaView, [string, string]> = {
  lista: ["Dia anterior", "Próximo dia"],
  dia: ["Dia anterior", "Próximo dia"],
  semana: ["Semana anterior", "Próxima semana"],
  mes: ["Mês anterior", "Próximo mês"],
};

export default async function AgendaPage({ searchParams }: Props) {
  const member = await requireReadyMember();
  const { business } = member;
  const seeAll = can(member, "appointments.view_all");
  const finance = can(member, "finance.view");
  const manage = can(member, "appointments.manage_all");
  const sp = await searchParams;
  const tz = business.timezone;
  const today = todayIn(tz);
  const date = sp.data && isLocalDate(sp.data) ? sp.data : today;
  const chosenView = parseView(sp.visao);
  const savedView = parseView((await cookies()).get(AGENDA_VIEW_COOKIE)?.value);
  const pick = (v: AgendaView | null) => (v && ENABLED_VIEWS.includes(v) ? v : null);
  const view: AgendaView = pick(chosenView) ?? pick(savedView) ?? "lista";

  const supabase = await createSupabaseServerClient();
  const { ctx, appointments, blocks } = await loadAgendaDay(supabase, business, date, {
    withPrices: finance,
  });
  // Profissional vê só a própria agenda, sem escolher outros (CAL-112).
  const staffId = !seeAll
    ? member.staffMemberId
    : sp.profissional && ctx.staff.some((s) => s.id === sp.profissional)
      ? sp.profissional
      : null;
  const state: AgendaState = { date, view, staffId: seeAll ? staffId : null };
  const range = visibleRange(date, view);
  const staffQuery = state.staffId ? `&profissional=${state.staffId}` : "";
  const viewQuery = `&visao=${view}${staffQuery}`;

  const title =
    view === "semana"
      ? weekLabel(date)
      : view === "mes"
        ? monthLabel(date)
        : (() => {
            const label = formatDayLabel(localDateToInstant(date, tz), tz);
            return date === today ? `Hoje, ${label}` : label;
          })();
  const [prevLabel, nextLabel] = PREV_LABEL[view];
  const showToday = today < range.from || today > range.to;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-6 pb-10 md:pt-10">
      {!chosenView && !savedView ? (
        <DesktopDefaultView href={agendaHref(state, { view: "semana" })} />
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold text-ink">Agenda</h1>
          <p className="mt-0.5 text-ink-2 first-letter:uppercase" aria-live="polite">
            {title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/bloquear?data=${date}`}
            className={buttonClasses({ variant: "outline", size: "md" })}
          >
            Bloquear
          </Link>
          {manage ? (
            <>
              <Link
                href={`/registrar?data=${date <= today ? date : today}`}
                className={buttonClasses({ variant: "outline", size: "md" })}
              >
                Registrar
              </Link>
              <Link href={`/novo?data=${date}`} className={buttonClasses({ size: "md" })}>
                + Novo
              </Link>
            </>
          ) : null}
        </div>
      </header>

      <RealtimeRefresh businessId={business.id} />
      {await quotaAlert()}

      <nav aria-label="Navegar na agenda" className="flex flex-wrap items-center gap-2">
        <Link
          href={agendaHref(state, { date: shiftDate(date, view, -1) })}
          aria-label={prevLabel}
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ‹
        </Link>
        <Link
          href={agendaHref(state, { date: shiftDate(date, view, 1) })}
          aria-label={nextLabel}
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ›
        </Link>
        {showToday ? (
          <Link
            href={agendaHref(state, { date: today })}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            Hoje
          </Link>
        ) : null}
        <DatePicker value={date} query={viewQuery} />
        <div className="ml-auto">
          <ViewSwitcher
            current={view}
            views={AGENDA_VIEWS.filter((v) => ENABLED_VIEWS.includes(v.key)).map((v) => ({
              ...v,
              href: agendaHref(state, { view: v.key }),
            }))}
          />
        </div>
      </nav>

      {seeAll ? (
        <StaffChips
          staff={ctx.staff}
          selected={staffId}
          hrefFor={(id) => agendaHref(state, { staffId: id })}
        />
      ) : null}

      {view === "semana" ? await renderWeek() : await renderList()}
    </main>
  );

  async function quotaAlert() {
    const quota =
      canSendAutomaticMessages(business) && can(member, "settings.manage")
        ? await getMonthQuota(supabase, business)
        : null;
    return <QuotaAlert notice={quota?.notice ?? null} />;
  }

  async function renderWeek() {
    const days = weekDaysOf(date);
    const list = (
      await loadAppointments(supabase, business.id, {
        from: zonedDayRange(days[0], tz).start,
        to: zonedDayRange(days[6], tz).end,
      })
    ).filter((a) => !staffId || a.staffId === staffId);
    return (
      <WeekView
        days={days}
        appointments={list}
        timezone={tz}
        today={today}
        dayHref={(d) => agendaHref(state, { date: d, view: "lista" })}
      />
    );
  }

  async function renderList() {
    const staffNames = Object.fromEntries(ctx.staff.map((s) => [s.id, s.name]));
    const { items, canceled, dayStatus } = buildTimeline({
      ctx,
      date,
      staffId,
      appointments,
      blocks,
    });
    const summary = daySummary(appointments.filter((a) => !staffId || a.staffId === staffId));
    const { data: waiting } = !manage
      ? { data: [] }
      : await supabase
          .from("waitlist_entries")
          .select(
            "id, customer_name, customer_whatsapp, service_id, staff_member_id, desired_date, period, status, services(name)",
          )
          .eq("business_id", business.id)
          .eq("desired_date", date)
          .neq("status", "closed")
          .order("created_at");
    const waitlist: WaitlistItem[] = (waiting ?? []).map((w) => ({
      id: w.id,
      name: w.customer_name,
      whatsapp: w.customer_whatsapp,
      service: w.services?.name ?? "",
      period: periodLabel(w.period),
      status: w.status,
      waLink: waMeLink(w.customer_whatsapp, waitlistMessage(business, w, w.services?.name ?? "")),
    }));
    return (
      <>
        <section
          aria-label="Resumo do dia"
          className={`grid gap-2 ${finance ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <Stat label="Agendamentos" value={String(summary.total)} />
          <Stat label="Livres" value={String(items.filter((i) => i.kind === "free").length)} />
          {finance ? (
            <Stat label="Previsto" value={formatPrice(summary.expectedRevenueCents)} />
          ) : null}
        </section>

        <Timeline
          items={items}
          canceled={canceled}
          timezone={tz}
          date={date}
          dayStatus={dayStatus}
          staffNames={staffNames}
          showStaff={seeAll && !staffId && ctx.staff.length > 1}
        />
        <WaitlistSection items={waitlist} />
      </>
    );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-3 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
