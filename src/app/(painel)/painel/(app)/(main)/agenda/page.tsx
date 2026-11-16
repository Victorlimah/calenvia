import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Timeline } from "@/components/painel/agenda/timeline";
import { buttonClasses } from "@/components/ui";
import { appointmentsByDay, dayState, hourAxis, type DayState } from "@/lib/agenda/calendar";
import { loadAgendaDay, loadAppointments, loadBlocks } from "@/lib/agenda/load";
import { buildTimeline, daySummary, type AgendaBlock } from "@/lib/agenda/timeline";
import {
  AGENDA_VIEW_COOKIE,
  AGENDA_VIEWS,
  agendaHref,
  monthGrid,
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
  weekdayOf,
  zonedDayRange,
} from "@/lib/dates";
import { WEEKDAY_SHORT } from "@/lib/weekdays";
import { DatePicker } from "@/components/painel/agenda/date-picker";
import { StaffChips } from "@/components/painel/agenda/staff-chips";
import { DesktopDefaultView, ViewSwitcher } from "@/components/painel/agenda/view-switcher";
import { HourGrid } from "@/components/painel/agenda/hour-grid";
import { MonthView } from "@/components/painel/agenda/month-view";
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
const ENABLED_VIEWS: AgendaView[] = ["lista", "dia", "semana", "mes"];

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
  const wide = view === "mes" || view === "semana" || view === "dia";

  return (
    <main
      className={`mx-auto w-full space-y-5 px-4 pt-6 pb-10 md:pt-10 ${wide ? "max-w-6xl md:px-8" : "max-w-2xl"}`}
    >
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

      {view === "semana"
        ? await renderWeek()
        : view === "mes"
          ? await renderMonth()
          : view === "dia"
            ? renderDay()
            : await renderList()}
    </main>
  );

  async function quotaAlert() {
    const quota =
      canSendAutomaticMessages(business) && can(member, "settings.manage")
        ? await getMonthQuota(supabase, business)
        : null;
    return <QuotaAlert notice={quota?.notice ?? null} />;
  }

  /** Bloqueios que tocam o dia, cortados nos limites do dia (bloqueio de vários dias). */
  function clipToDay(list: AgendaBlock[], d: string): AgendaBlock[] {
    const { start, end } = zonedDayRange(d, tz);
    return list
      .filter((b) => b.start < end && b.end > start)
      .map((b) => ({
        ...b,
        start: b.start < start ? start : b.start,
        end: b.end > end ? end : b.end,
      }));
  }

  /** Horário de funcionamento que vale para a visão (do profissional filtrado, se ele tiver). */
  function effectiveHours() {
    const own = staffId ? ctx.staff.find((s) => s.id === staffId)?.hours : undefined;
    return own && own.length ? own : ctx.businessHours;
  }

  async function renderWeek() {
    const days = weekDaysOf(date);
    const from = zonedDayRange(days[0], tz).start;
    const to = zonedDayRange(days[6], tz).end;
    const [all, weekBlocks] = await Promise.all([
      loadAppointments(supabase, business.id, { from, to }),
      loadBlocks(supabase, business.id, { from, to }),
    ]);
    const list = all.filter((a) => !staffId || a.staffId === staffId);
    const blocksFor = weekBlocks.filter((b) => !staffId || !b.staffId || b.staffId === staffId);
    const byDay = appointmentsByDay(list, tz);
    const hours = effectiveHours();
    const axis = hourAxis(hours, list, tz);
    return (
      <>
        {/* Computador (CAL-122): colunas por dia com eixo de horas */}
        <div className="hidden lg:block">
          <HourGrid
            label={`Semana de ${weekLabel(date)}`}
            axis={axis}
            timezone={tz}
            now={new Date()}
            columns={days.map((d) => {
              const [, m, day] = d.split("-").map(Number);
              return {
                key: d,
                label: WEEKDAY_SHORT[weekdayOf(d)],
                sublabel: `${day}/${String(m).padStart(2, "0")}`,
                href: agendaHref(state, { date: d, view: "dia" }),
                highlight: d === today,
                closed: dayState(d, hours, [], tz) === "closed",
                appointments: byDay.get(d) ?? [],
                blocks: clipToDay(blocksFor, d),
                showNow: d === today,
              };
            })}
          />
        </div>
        {/* Celular e tablet: lista da semana */}
        <div className="lg:hidden">
          <WeekView
            days={days}
            appointments={list}
            timezone={tz}
            today={today}
            dayHref={(d) => agendaHref(state, { date: d, view: "lista" })}
          />
        </div>
      </>
    );
  }

  /** Visão Dia: grade de horas com uma coluna por profissional (ou só a do filtrado). */
  function renderDay() {
    const cols = staffId ? ctx.staff.filter((s) => s.id === staffId) : ctx.staff;
    const visible = appointments.filter((a) => a.status !== "canceled");
    const ownHours = (id: string) => {
      const h = ctx.staff.find((s) => s.id === id)?.hours;
      return h && h.length ? h : ctx.businessHours;
    };
    const axis = hourAxis(ctx.businessHours, visible, tz);
    return (
      <HourGrid
        label="Dia por profissional"
        axis={axis}
        timezone={tz}
        now={new Date()}
        columns={cols.map((s) => ({
          key: s.id,
          label: s.name.split(" ")[0],
          sublabel: s.name.includes(" ") ? s.name.split(" ").slice(1).join(" ") : undefined,
          href: seeAll ? agendaHref(state, { staffId: s.id, view: "lista" }) : undefined,
          closed: dayState(date, ownHours(s.id), [], tz) === "closed",
          appointments: visible.filter((a) => a.staffId === s.id),
          blocks: clipToDay(
            blocks.filter((b) => !b.staffId || b.staffId === s.id),
            date,
          ),
          showNow: date === today,
        }))}
      />
    );
  }

  async function renderMonth() {
    const weeks = monthGrid(date);
    const from = zonedDayRange(range.from, tz).start;
    const to = zonedDayRange(range.to, tz).end;
    const [list, monthBlocks] = await Promise.all([
      loadAppointments(supabase, business.id, { from, to }),
      loadBlocks(supabase, business.id, { from, to }),
    ]);
    const filtered = list.filter((a) => !staffId || a.staffId === staffId);
    const byDay = Object.fromEntries(appointmentsByDay(filtered, tz));
    const hours = effectiveHours();
    const states: Record<string, DayState> = Object.fromEntries(
      weeks.flat().map((c) => [c.date, dayState(c.date, hours, monthBlocks, tz, staffId)]),
    );
    return (
      <MonthView
        weeks={weeks}
        byDay={byDay}
        states={states}
        today={today}
        selected={date}
        timezone={tz}
        monthTitle={monthLabel(date)}
        dayHref={(d) => agendaHref(state, { date: d, view: "lista" })}
        selectHref={(d) => agendaHref(state, { date: d })}
        newHref={manage ? (d) => `/novo?data=${d}` : null}
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
