"use client";

import { useState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { weekHoursSchema, type DayHours } from "@/lib/validation/business";
import { WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/weekdays";
import { saveHoursAction } from "@/app/(painel)/painel/(app)/_actions/business";
import type { ActionResult } from "@/lib/action-result";
import { useAction } from "./use-action";

type Props = {
  initial: DayHours[];
  submitLabel?: string;
  onSaved?: () => void;
  /** Intervalos (almoço) só fazem sentido no horário do negócio. */
  allowBreaks?: boolean;
  /** Ação de salvar (padrão: horário do negócio). */
  onSubmit?: (days: DayHours[]) => Promise<ActionResult>;
};

export function HoursEditor({
  initial,
  submitLabel = "Salvar horários",
  onSaved,
  allowBreaks = true,
  onSubmit,
}: Props) {
  const [days, setDays] = useState<DayHours[]>(() =>
    [...initial].sort((a, b) => a.weekday - b.weekday),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const { run, pending, error, message } = useAction();

  function update(weekday: number, patch: Partial<DayHours>) {
    setDays((list) => list.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function copyToAll(from: DayHours) {
    setDays((list) =>
      list.map((d) =>
        d.weekday === from.weekday || !d.is_open
          ? d
          : { ...d, opens_at: from.opens_at, closes_at: from.closes_at, breaks: from.breaks },
      ),
    );
  }

  function save() {
    const normalized = days.map((d) => ({
      ...d,
      opens_at: d.is_open ? (d.opens_at ?? "09:00") : null,
      closes_at: d.is_open ? (d.closes_at ?? "18:00") : null,
      breaks: d.is_open ? (d.breaks ?? []) : [],
    }));
    const parsed = weekHoursSchema.safeParse(normalized);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const day = typeof issue.path[0] === "number" ? normalized[issue.path[0]] : null;
      setLocalError(`${day ? WEEKDAY_NAMES[day.weekday] + ": " : ""}${issue.message}`);
      return;
    }
    setLocalError(null);
    const data = parsed.data;
    run(() => (onSubmit ? onSubmit(data) : saveHoursAction(data)), {
      onSuccess: () => onSaved?.(),
    });
  }

  return (
    <div className="space-y-3">
      {localError || error ? <Alert tone="danger">{localError ?? error}</Alert> : null}
      {message && !onSaved ? <Alert tone="success">{message}</Alert> : null}
      {WEEKDAY_ORDER.map((weekday) => {
        const d = days.find((x) => x.weekday === weekday)!;
        const name = WEEKDAY_NAMES[weekday];
        return (
          <Card key={weekday} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{name}</p>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  role="switch"
                  className="size-5 accent-brand"
                  checked={d.is_open}
                  onChange={(e) =>
                    update(weekday, {
                      is_open: e.target.checked,
                      opens_at: d.opens_at ?? "09:00",
                      closes_at: d.closes_at ?? "18:00",
                    })
                  }
                />
                {d.is_open ? "Aberto" : "Fechado"}
              </label>
            </div>
            {d.is_open ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TimeInput
                    label={`Abre (${name})`}
                    visibleLabel="Abre às"
                    value={d.opens_at ?? ""}
                    onChange={(v) => update(weekday, { opens_at: v })}
                  />
                  <TimeInput
                    label={`Fecha (${name})`}
                    visibleLabel="Fecha às"
                    value={d.closes_at ?? ""}
                    onChange={(v) => update(weekday, { closes_at: v })}
                  />
                </div>
                {(allowBreaks ? (d.breaks ?? []) : []).map((b, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                    <TimeInput
                      label={`Início do intervalo ${i + 1} (${name})`}
                      visibleLabel="Intervalo de"
                      value={b.starts_at}
                      onChange={(v) =>
                        update(weekday, {
                          breaks: d.breaks!.map((x, j) => (j === i ? { ...x, starts_at: v } : x)),
                        })
                      }
                    />
                    <TimeInput
                      label={`Fim do intervalo ${i + 1} (${name})`}
                      visibleLabel="até"
                      value={b.ends_at}
                      onChange={(v) =>
                        update(weekday, {
                          breaks: d.breaks!.map((x, j) => (j === i ? { ...x, ends_at: v } : x)),
                        })
                      }
                    />
                    <button
                      type="button"
                      aria-label={`Remover intervalo ${i + 1} de ${name}`}
                      className="inline-flex size-12 items-center justify-center rounded-xl text-xl text-ink-2 hover:bg-paper-2"
                      onClick={() =>
                        update(weekday, { breaks: d.breaks!.filter((_, j) => j !== i) })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {allowBreaks ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update(weekday, {
                          breaks: [...(d.breaks ?? []), { starts_at: "12:00", ends_at: "13:00" }],
                        })
                      }
                    >
                      + Intervalo (almoço)
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => copyToAll(d)}>
                    Copiar para os dias abertos
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        );
      })}
      <Button size="lg" block loading={pending} onClick={save}>
        {submitLabel}
      </Button>
    </div>
  );
}

function TimeInput({
  label,
  visibleLabel,
  value,
  onChange,
}: {
  label: string;
  visibleLabel: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm text-ink-2" aria-hidden="true">
        {visibleLabel}
      </span>
      <input
        type="time"
        aria-label={label}
        step={900}
        value={value.slice(0, 5)}
        onChange={(e) => onChange(e.target.value)}
        className="block min-h-12 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 text-base"
      />
    </label>
  );
}
