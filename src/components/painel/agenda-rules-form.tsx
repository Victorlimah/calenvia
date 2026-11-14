"use client";

import { useForm } from "react-hook-form";
import { Alert, Button, Field, Select } from "@/components/ui";
import type { AgendaRulesInput } from "@/lib/validation/business";
import { saveAgendaRulesAction } from "@/app/(painel)/painel/(app)/_actions/business";
import { useAction } from "./use-action";

export const NOTICE_OPTIONS = [
  { value: 0, label: "Sem antecedência" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 720, label: "12 horas" },
  { value: 1440, label: "1 dia" },
  { value: 2880, label: "2 dias" },
];

const DAYS_AHEAD = [7, 14, 21, 30, 45, 60, 90];

function withCurrent(options: { value: number; label: string }[], current: number, unit: string) {
  return options.some((o) => o.value === current)
    ? options
    : [...options, { value: current, label: `${current} ${unit}` }].sort(
        (a, b) => a.value - b.value,
      );
}

export function AgendaRulesForm({ defaults }: { defaults: AgendaRulesInput }) {
  const { run, pending, error, message } = useAction();
  const form = useForm<AgendaRulesInput>({ defaultValues: defaults });

  const onSubmit = form.handleSubmit((values) => run(() => saveAgendaRulesAction(values)));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Field
        label="Intervalo entre horários"
        hint="De quanto em quanto tempo aparecem os horários para o cliente escolher."
      >
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} {...form.register("slot_interval_min")}>
            <option value={15}>A cada 15 minutos</option>
            <option value={30}>A cada 30 minutos</option>
            <option value={60}>A cada 1 hora</option>
          </Select>
        )}
      </Field>

      <Field
        label="Antecedência mínima"
        hint="O cliente não consegue agendar em cima da hora. Ex.: com 1 hora, às 14h o primeiro horário é 15h."
      >
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} {...form.register("min_notice_min")}>
            {withCurrent(NOTICE_OPTIONS, Number(defaults.min_notice_min), "min").map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Até quantos dias à frente" hint="Quanto tempo no futuro a agenda fica aberta.">
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} {...form.register("max_days_ahead")}>
            {withCurrent(
              DAYS_AHEAD.map((d) => ({ value: d, label: `${d} dias` })),
              Number(defaults.max_days_ahead),
              "dias",
            ).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Prazo para remarcar ou cancelar"
        hint="Até quanto tempo antes o cliente pode remarcar ou cancelar pelo link."
      >
        {({ id, describedBy }) => (
          <Select id={id} aria-describedby={describedBy} {...form.register("cancel_notice_min")}>
            {withCurrent(NOTICE_OPTIONS, Number(defaults.cancel_notice_min), "min").map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === 0 ? "Até a hora do atendimento" : `${o.label} antes`}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Button type="submit" size="lg" block loading={pending}>
        Salvar regras
      </Button>
    </form>
  );
}
