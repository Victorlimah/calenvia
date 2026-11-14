import Link from "next/link";
import { Badge } from "@/components/ui";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import type { AgendaAppointment } from "@/lib/agenda/timeline";
import {
  formatShortDate,
  formatTime,
  localDateToInstant,
  toLocalDate,
  weekdayOf,
} from "@/lib/dates";
import { WEEKDAY_NAMES } from "@/lib/weekdays";
import { cn } from "@/lib/cn";

export function WeekView({
  days,
  appointments,
  timezone,
  today,
  staffQuery,
}: {
  days: string[];
  appointments: AgendaAppointment[];
  timezone: string;
  today: string;
  staffQuery: string;
}) {
  return (
    <ol className="space-y-3" aria-label="Semana">
      {days.map((d) => {
        const list = appointments.filter(
          (a) => toLocalDate(a.start, timezone) === d && a.status !== "canceled",
        );
        return (
          <li key={d}>
            <Link
              href={`/?data=${d}${staffQuery}`}
              className={cn(
                "block rounded-2xl border bg-white px-4 py-3 hover:border-brand",
                d === today ? "border-brand" : "border-line",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {WEEKDAY_NAMES[weekdayOf(d)]},{" "}
                  {formatShortDate(localDateToInstant(d, timezone), timezone)}
                  {d === today ? <span className="ml-2 text-sm text-brand">Hoje</span> : null}
                </p>
                <span className="text-sm text-muted">
                  {list.length === 0
                    ? "Livre"
                    : `${list.length} agendamento${list.length > 1 ? "s" : ""}`}
                </span>
              </div>
              {list.length ? (
                <ul className="mt-2 space-y-1">
                  {list.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold tabular-nums">
                          {formatTime(a.start, timezone)}
                        </span>{" "}
                        {a.customerName}
                        <span className="text-muted"> · {a.serviceName}</span>
                      </span>
                      <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </li>
                  ))}
                  {list.length > 6 ? (
                    <li className="text-sm text-muted">+ {list.length - 6} outros</li>
                  ) : null}
                </ul>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
