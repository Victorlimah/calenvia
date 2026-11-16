import Link from "next/link";
import { nowLine, placeInColumn } from "@/lib/agenda/calendar";
import { STATUS_LABELS } from "@/lib/agenda/status";
import type { AgendaAppointment, AgendaBlock } from "@/lib/agenda/timeline";
import { cn } from "@/lib/cn";
import { formatTime, minutesToTime } from "@/lib/dates";

export type HourColumn = {
  key: string;
  label: string;
  sublabel?: string;
  /** Link do título da coluna (abrir o dia). */
  href?: string;
  highlight?: boolean;
  closed?: boolean;
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  /** Mostra a linha do "agora" nesta coluna. */
  showNow?: boolean;
};

const HOUR_PX = 64;

/**
 * Grade de horas (CAL-122): colunas (dias da semana ou profissionais do dia), eixo de horas e
 * blocos com altura proporcional à duração. Sem arrastar nesta versão.
 */
export function HourGrid({
  columns,
  axis,
  timezone,
  now,
  label,
}: {
  columns: HourColumn[];
  axis: { startMin: number; endMin: number };
  timezone: string;
  now: Date;
  label: string;
}) {
  const hours: number[] = [];
  for (let m = axis.startMin; m < axis.endMin; m += 60) hours.push(m);
  const height = ((axis.endMin - axis.startMin) / 60) * HOUR_PX;
  const nowPos = nowLine(now, axis, timezone);
  return (
    <section
      aria-label={label}
      className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(0, 1fr))`,
          minWidth: 56 + columns.length * 130,
        }}
      >
        <div className="sticky top-0 z-10 border-b border-line bg-white" />
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn(
              "sticky top-0 z-10 border-b border-l border-line bg-white px-2 py-2 text-center",
              c.highlight && "text-brand",
            )}
          >
            {c.href ? (
              <Link href={c.href} className="block rounded-lg font-semibold hover:bg-paper-2">
                {c.label}
                {c.sublabel ? (
                  <span className="block text-xs font-normal text-muted">{c.sublabel}</span>
                ) : null}
              </Link>
            ) : (
              <p className="font-semibold">
                {c.label}
                {c.sublabel ? (
                  <span className="block text-xs font-normal text-muted">{c.sublabel}</span>
                ) : null}
              </p>
            )}
          </div>
        ))}

        <div className="relative" style={{ height }} aria-hidden="true">
          {hours.map((m) => (
            <span
              key={m}
              className="absolute right-2 -translate-y-1/2 text-xs text-muted tabular-nums"
              style={{ top: ((m - axis.startMin) / 60) * HOUR_PX }}
            >
              {m === axis.startMin ? "" : minutesToTime(m)}
            </span>
          ))}
        </div>

        {columns.map((c) => {
          const placed = placeInColumn(c.appointments, axis, timezone);
          const blocks = placeInColumn(c.blocks, axis, timezone);
          return (
            <div
              key={c.key}
              className={cn("relative border-l border-line", c.closed && "bg-paper-2/70")}
              style={{ height }}
            >
              {hours.map((m) => (
                <div
                  key={m}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-line/70"
                  style={{ top: ((m - axis.startMin) / 60) * HOUR_PX }}
                />
              ))}
              {c.closed ? (
                <p className="absolute inset-x-0 top-2 text-center text-xs text-muted">Fechado</p>
              ) : null}
              {blocks.map((b) => (
                <div
                  key={b.item.id}
                  className="absolute inset-x-1 overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,var(--color-paper-2),var(--color-paper-2)_6px,white_6px,white_12px)] px-1.5 py-0.5 text-[11px] text-ink-2"
                  style={{ top: `${b.top}%`, height: `${b.height}%` }}
                >
                  Bloqueado{b.item.reason ? ` · ${b.item.reason}` : ""}
                </div>
              ))}
              <ul
                aria-label={`Agendamentos: ${c.label}${c.sublabel ? ` ${c.sublabel}` : ""}`}
                className="pointer-events-none absolute inset-0 [&>li]:pointer-events-auto"
              >
                {placed.map((p) => {
                  const a = p.item;
                  return (
                    <li
                      key={a.id}
                      className="absolute px-0.5"
                      style={{
                        top: `${p.top}%`,
                        height: `${p.height}%`,
                        left: `${(p.lane / p.lanes) * 100}%`,
                        width: `${100 / p.lanes}%`,
                      }}
                    >
                      <Link
                        href={`/agendamento/${a.id}`}
                        aria-label={`${formatTime(a.start, timezone)} às ${formatTime(a.end, timezone)}: ${a.customerName}, ${a.serviceName}, ${STATUS_LABELS[a.status]}`}
                        className={cn(
                          "block h-full overflow-hidden rounded-md border-l-4 px-1.5 py-0.5 text-xs leading-tight hover:ring-1 hover:ring-brand",
                          a.status === "completed"
                            ? "border-success bg-success-50"
                            : a.status === "no_show"
                              ? "border-danger bg-danger-50 line-through"
                              : "border-brand bg-brand-50",
                        )}
                      >
                        <span className="font-semibold tabular-nums">
                          {formatTime(a.start, timezone)}
                        </span>{" "}
                        <span className="font-semibold">{a.customerName}</span>
                        <span className="block truncate text-ink-2">{a.serviceName}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {c.showNow && nowPos !== null ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[1] border-t-2 border-danger"
                  style={{ top: `${nowPos}%` }}
                  aria-hidden="true"
                >
                  <span className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-danger" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
