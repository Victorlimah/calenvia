"use client";

import { useEffect, useState } from "react";
import { PERIOD_LABELS, type DayPeriod } from "@/lib/availability/types";
import {
  addLocalDays,
  diffLocalDays,
  formatDayLabel,
  localDateToInstant,
  weekdayOf,
} from "@/lib/dates";
import { WEEKDAY_SHORT } from "@/lib/weekdays";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { readableTextOn } from "@/lib/color";
import type { PublicAvailability } from "@/lib/public/availability";
import { availabilityAction } from "@/app/(negocio)/[slug]/agendar/actions";

const PERIODS: DayPeriod[] = ["morning", "afternoon", "evening"];
const STRIP = 14;

type Props = {
  slug: string;
  serviceId: string;
  staffId: string | null;
  timezone: string;
  accent: string;
  date: string | null;
  start: string | null;
  onChange: (value: { date: string | null; start: string | null }) => void;
  /** Remarcação pelo link: o horário atual do agendamento conta como livre. */
  manageCode?: string;
};

export function TimeStep({
  slug,
  serviceId,
  staffId,
  timezone,
  accent,
  date,
  start,
  onChange,
  manageCode,
}: Props) {
  const [from, setFrom] = useState<string | null>(date);
  const [data, setData] = useState<PublicAvailability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    availabilityAction({ slug, serviceId, staffId, from, date, manageCode })
      .then((r) => {
        if (!alive) return;
        if (!r.ok) return setError(r.error);
        setData(r.data);
        if (!date && r.data.date) onChange({ date: r.data.date, start: null });
      })
      .catch(() => alive && setError("Sem conexão. Verifique a internet e tente de novo."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, serviceId, staffId, from, date, attempt, manageCode]);

  const accentFg = readableTextOn(accent);
  const label = (d: string, pattern: string) =>
    formatInTimeZone(localDateToInstant(d, timezone), timezone, pattern, { locale: ptBR });

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5"
      >
        <p className="font-semibold">{error}</p>
        <button
          type="button"
          className="mt-3 min-h-11 font-semibold underline underline-offset-4"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const stripFrom = data?.from ?? from;
  const canPrev = Boolean(data && diffLocalDays(data.today, data.from) > 0);
  const canNext = Boolean(data && diffLocalDays(addLocalDays(data.from, STRIP), data.maxDate) >= 0);
  const hasSlots = data && PERIODS.some((p) => data.groups[p].length > 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold first-letter:uppercase">
            {stripFrom && data ? label(data.date ?? stripFrom, "MMMM 'de' yyyy") : " "}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Dias anteriores"
              disabled={!canPrev || loading}
              onClick={() => {
                const prev = addLocalDays(data!.from, -STRIP);
                setFrom(diffLocalDays(data!.today, prev) < 0 ? data!.today : prev);
                onChange({ date: null, start: null });
              }}
              className="inline-flex size-11 items-center justify-center rounded-xl text-xl hover:bg-white/10 disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próximos dias"
              disabled={!canNext || loading}
              onClick={() => {
                setFrom(addLocalDays(data!.from, STRIP));
                onChange({ date: null, start: null });
              }}
              className="inline-flex size-11 items-center justify-center rounded-xl text-xl hover:bg-white/10 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
        <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2" aria-label="Dias">
          {(data?.days ?? Array.from({ length: 7 }, () => null)).map((d, i) => {
            if (!d) {
              return (
                <li
                  key={i}
                  className="h-[76px] w-16 shrink-0 animate-pulse rounded-2xl bg-white/5"
                />
              );
            }
            const selected = d.date === (date ?? data?.date);
            const disabled = d.status !== "open";
            return (
              <li key={d.date} className="snap-start">
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${formatDayLabel(localDateToInstant(d.date, timezone), timezone)}${disabled ? " (sem horários)" : ""}`}
                  onClick={() => onChange({ date: d.date, start: null })}
                  className="flex h-[76px] w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 text-center disabled:opacity-35"
                  style={
                    selected
                      ? { background: accent, borderColor: accent, color: accentFg }
                      : { borderColor: "rgba(255,255,255,.12)" }
                  }
                >
                  <span className="text-xs font-semibold uppercase">
                    {d.date === data?.today ? "Hoje" : WEEKDAY_SHORT[weekdayOf(d.date)]}
                  </span>
                  <span className="font-display text-2xl font-extrabold">{label(d.date, "d")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {loading && !data ? (
        <p role="status" className="text-night-sub">
          Carregando horários…
        </p>
      ) : null}

      {data && !hasSlots ? (
        <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5">
          <p className="font-semibold">
            {data.date
              ? "Não há horários livres neste dia."
              : "Não há horários livres nestes dias."}
          </p>
          {data.nextAvailable ? (
            <button
              type="button"
              className="mt-4 inline-flex min-h-12 items-center rounded-[var(--radius-control)] px-5 font-bold"
              style={{ background: accent, color: accentFg }}
              onClick={() => {
                setFrom(data.nextAvailable);
                onChange({ date: data.nextAvailable, start: null });
              }}
            >
              Ver próximo dia com horário (
              {formatDayLabel(localDateToInstant(data.nextAvailable, timezone), timezone)})
            </button>
          ) : (
            <p className="mt-2 text-night-sub">
              A agenda está cheia nos próximos dias. Fale com o estabelecimento pelo WhatsApp.
            </p>
          )}
        </div>
      ) : null}

      {data && hasSlots ? (
        <div className={loading ? "opacity-60" : ""} aria-busy={loading}>
          {PERIODS.filter((p) => data.groups[p].length).map((p) => (
            <section key={p} className="mb-6">
              <h2 className="mb-3 font-display text-lg font-bold">{PERIOD_LABELS[p]}</h2>
              <ul
                className="grid grid-cols-4 gap-2"
                aria-label={`Horários da ${PERIOD_LABELS[p].toLowerCase()}`}
              >
                {data.groups[p].map((s) => {
                  const selected = s.start === start;
                  return (
                    <li key={s.start}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange({ date: data.date, start: s.start })}
                        className="min-h-12 w-full rounded-xl border-2 font-semibold"
                        style={
                          selected
                            ? { background: accent, borderColor: accent, color: accentFg }
                            : { borderColor: "rgba(255,255,255,.15)" }
                        }
                      >
                        {s.time}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
