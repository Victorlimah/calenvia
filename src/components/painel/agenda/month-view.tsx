import Link from "next/link";
import { Badge } from "@/components/ui";
import type { DayState } from "@/lib/agenda/calendar";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import type { AgendaAppointment } from "@/lib/agenda/timeline";
import { MONTHS_PT, type MonthCell } from "@/lib/agenda/view";
import { cn } from "@/lib/cn";
import { formatTime, weekdayOf } from "@/lib/dates";
import { WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/weekdays";

const HEAD = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo
const MAX_CHIPS = 3;

type Props = {
  weeks: MonthCell[][];
  byDay: Record<string, AgendaAppointment[]>;
  states: Record<string, DayState>;
  today: string;
  selected: string;
  timezone: string;
  monthTitle: string;
  dayHref: (date: string) => string;
  /** Link para o mês com este dia selecionado (celular). */
  selectHref: (date: string) => string;
  /** null = sem permissão para criar agendamento. */
  newHref: ((date: string) => string) | null;
};

function dayLabel(date: string, count: number, state: DayState) {
  const [, m, d] = date.split("-").map(Number);
  const base = `${WEEKDAY_NAMES[weekdayOf(date)]}, ${d} de ${MONTHS_PT[m - 1]}`;
  if (state === "closed") return `${base}: fechado`;
  if (state === "blocked") return `${base}: bloqueado`;
  if (count === 0) return `${base}: nenhum agendamento`;
  return `${base}: ${count} agendamento${count > 1 ? "s" : ""}`;
}

/** Visão Mês estilo Google Agenda (CAL-121): grade grande no computador, compacta no celular. */
export function MonthView(props: Props) {
  const { weeks, byDay, states, today, selected, timezone, monthTitle } = props;
  const selectedList = byDay[selected] ?? [];
  return (
    <div className="space-y-4">
      {/* Computador: grade com os agendamentos em chips */}
      <table
        className="hidden w-full table-fixed border-collapse overflow-hidden rounded-[var(--radius-card)] border border-line bg-white md:table"
        aria-label={`Calendário de ${monthTitle}`}
      >
        <thead>
          <tr>
            {HEAD.map((w) => (
              <th
                key={w}
                scope="col"
                className="border-b border-line py-2 text-xs font-semibold text-muted"
              >
                <abbr title={WEEKDAY_NAMES[w]} className="no-underline">
                  {WEEKDAY_SHORT[w]}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].date}>
              {week.map((cell) => {
                const list = byDay[cell.date] ?? [];
                const state = states[cell.date] ?? "open";
                const dim = !cell.inMonth || state !== "open";
                const isToday = cell.date === today;
                return (
                  <td
                    key={cell.date}
                    className={cn("h-32 border border-line p-1 align-top", dim && "bg-paper-2/60")}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        href={props.dayHref(cell.date)}
                        aria-label={dayLabel(cell.date, list.length, state)}
                        aria-current={isToday ? "date" : undefined}
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold hover:bg-paper-2",
                          isToday && "bg-brand text-white hover:bg-brand",
                          !isToday && dim && "text-muted",
                        )}
                      >
                        {Number(cell.date.slice(8))}
                      </Link>
                      {props.newHref && state === "open" && cell.date >= today ? (
                        <Link
                          href={props.newHref(cell.date)}
                          aria-label={`Novo agendamento em ${dayLabel(cell.date, list.length, state).split(":")[0]}`}
                          className="inline-flex size-8 items-center justify-center rounded-full text-lg text-ink-2 hover:bg-brand-50 hover:text-brand"
                        >
                          +
                        </Link>
                      ) : state !== "open" && cell.inMonth ? (
                        <span className="text-[11px] text-muted">
                          {state === "closed" ? "Fechado" : "Bloqueado"}
                        </span>
                      ) : null}
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {list.slice(0, MAX_CHIPS).map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/agendamento/${a.id}`}
                            title={`${formatTime(a.start, timezone)} ${a.customerName} · ${a.serviceName}`}
                            className={cn(
                              "block truncate rounded-md px-1.5 py-0.5 text-xs hover:ring-1 hover:ring-brand",
                              a.status === "completed"
                                ? "bg-success-50 text-ink"
                                : a.status === "no_show"
                                  ? "bg-danger-50 text-ink line-through"
                                  : "bg-brand-50 text-ink",
                            )}
                          >
                            <span className="font-semibold tabular-nums">
                              {formatTime(a.start, timezone)}
                            </span>{" "}
                            {a.customerName} · {a.serviceName}
                          </Link>
                        </li>
                      ))}
                      {list.length > MAX_CHIPS ? (
                        <li>
                          <Link
                            href={props.dayHref(cell.date)}
                            className="block px-1.5 text-xs font-semibold text-brand"
                          >
                            +{list.length - MAX_CHIPS} mais
                          </Link>
                        </li>
                      ) : null}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Celular: grade compacta com a contagem e a lista do dia escolhido embaixo */}
      <div className="md:hidden">
        <table
          className="w-full table-fixed border-collapse rounded-[var(--radius-card)] border border-line bg-white"
          aria-label={`Calendário de ${monthTitle} (compacto)`}
        >
          <thead>
            <tr>
              {HEAD.map((w) => (
                <th key={w} scope="col" className="py-1.5 text-xs font-semibold text-muted">
                  <abbr title={WEEKDAY_NAMES[w]} className="no-underline">
                    {WEEKDAY_SHORT[w].slice(0, 1)}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].date}>
                {week.map((cell) => {
                  const count = (byDay[cell.date] ?? []).length;
                  const state = states[cell.date] ?? "open";
                  const isSelected = cell.date === selected;
                  const isToday = cell.date === today;
                  return (
                    <td key={cell.date} className="p-0.5 text-center">
                      <Link
                        href={props.selectHref(cell.date)}
                        aria-label={dayLabel(cell.date, count, state)}
                        aria-current={isSelected ? "date" : undefined}
                        className={cn(
                          "mx-auto flex min-h-11 w-full flex-col items-center justify-center rounded-xl text-sm",
                          isSelected
                            ? "bg-ink font-bold text-white"
                            : isToday
                              ? "font-bold text-brand"
                              : !cell.inMonth || state !== "open"
                                ? "text-muted"
                                : "text-ink",
                        )}
                      >
                        {Number(cell.date.slice(8))}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "text-[10px] leading-none",
                            isSelected ? "text-white" : "text-brand",
                          )}
                        >
                          {count ? (count > 3 ? `${count}` : "•".repeat(count)) : " "}
                        </span>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <section aria-label="Agendamentos do dia escolhido" className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold first-letter:uppercase">
              {dayLabel(selected, selectedList.length, states[selected] ?? "open").split(":")[0]}
            </h2>
            <Link href={props.dayHref(selected)} className="text-sm font-semibold text-brand">
              Abrir o dia
            </Link>
          </div>
          {selectedList.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-line bg-white px-4 py-3 text-ink-2">
              {(states[selected] ?? "open") === "closed"
                ? "Fechado neste dia."
                : "Nenhum agendamento neste dia."}
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
              {selectedList.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/agendamento/${a.id}`}
                    className="flex min-h-12 items-center gap-3 px-4 py-2"
                  >
                    <span className="w-12 font-semibold tabular-nums">
                      {formatTime(a.start, timezone)}
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
      </div>
    </div>
  );
}
