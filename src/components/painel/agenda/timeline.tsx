import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { formatTime } from "@/lib/dates";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import type { AgendaAppointment, TimelineItem } from "@/lib/agenda/timeline";
import { cn } from "@/lib/cn";

type Props = {
  items: TimelineItem[];
  canceled: AgendaAppointment[];
  timezone: string;
  date: string;
  dayStatus: string;
  staffNames: Record<string, string>;
  showStaff: boolean;
};

export function Timeline({
  items,
  canceled,
  timezone,
  date,
  dayStatus,
  staffNames,
  showStaff,
}: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={dayStatus === "closed" ? "Fechado neste dia" : "Nada por aqui"}
        description={
          dayStatus === "closed"
            ? "Pelo seu horário de funcionamento, este dia não abre."
            : "Nenhum agendamento e nenhum horário livre neste dia."
        }
      />
    );
  }
  return (
    <div className="space-y-6">
      <ol className="space-y-2" aria-label="Linha do tempo do dia">
        {items.map((entry) => (
          <li
            key={`${entry.kind}-${entry.kind === "free" ? entry.time : entry.item.id}`}
            className="flex gap-3"
          >
            <span className="w-12 shrink-0 pt-3 text-right text-sm font-semibold text-ink-2 tabular-nums">
              {entry.time}
            </span>
            <div className="min-w-0 flex-1">
              {entry.kind === "appointment" ? (
                <AppointmentCard a={entry.item} timezone={timezone} showStaff={showStaff} />
              ) : entry.kind === "block" ? (
                <div className="rounded-2xl border border-line bg-paper-2 px-4 py-3 text-sm text-ink-2">
                  <p className="font-semibold">
                    Bloqueado até {formatTime(entry.item.end, timezone)}
                    {entry.item.staffId ? ` · ${staffNames[entry.item.staffId] ?? ""}` : " · Todos"}
                  </p>
                  {entry.item.reason ? <p>{entry.item.reason}</p> : null}
                </div>
              ) : (
                <Link
                  href={`/novo?data=${date}&hora=${entry.time}${entry.staffIds.length === 1 ? `&profissional=${entry.staffIds[0]}` : ""}`}
                  className="flex min-h-11 items-center justify-between rounded-2xl border border-dashed border-line px-4 text-sm text-muted hover:border-brand hover:text-brand"
                >
                  <span>
                    Livre
                    {showStaff && entry.staffIds.length
                      ? ` · ${entry.staffIds.map((id) => staffNames[id]).join(", ")}`
                      : ""}
                  </span>
                  <span className="font-semibold">+ Agendar</span>
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      {canceled.length ? (
        <details className="rounded-2xl border border-line bg-white px-4">
          <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold text-ink-2">
            Cancelados ({canceled.length})
          </summary>
          <ul className="space-y-2 pb-4">
            {canceled.map((a) => (
              <li key={a.id}>
                <AppointmentCard a={a} timezone={timezone} showStaff={showStaff} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function AppointmentCard({
  a,
  timezone,
  showStaff,
}: {
  a: AgendaAppointment;
  timezone: string;
  showStaff: boolean;
}) {
  return (
    <Link
      href={`/agendamento/${a.id}`}
      className={cn(
        "block rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors hover:border-brand",
        a.status === "confirmed" && "border-l-4 border-l-brand",
        a.status === "completed" && "border-l-4 border-l-success",
        a.status === "no_show" && "border-l-4 border-l-warning",
        a.status === "canceled" && "opacity-60",
        "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("font-semibold text-ink", a.status === "canceled" && "line-through")}>
          {a.customerName}
        </p>
        <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
      </div>
      <p className="mt-0.5 text-sm text-ink-2">
        {a.serviceName} · {formatTime(a.start, timezone)}–{formatTime(a.end, timezone)}
        {showStaff ? ` · ${a.staffName}` : ""}
      </p>
      {a.status === "confirmed" && !a.confirmationSent ? (
        <p className="mt-1 text-xs font-semibold text-warning">Confirmação ainda não enviada</p>
      ) : null}
    </Link>
  );
}
