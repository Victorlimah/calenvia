"use client";

import { useState } from "react";
import { saveStaffHoursAction } from "@/app/(painel)/painel/(app)/_actions/staff";
import { HoursEditor } from "@/components/painel/hours-editor";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card } from "@/components/ui";
import type { DayHours } from "@/lib/validation/business";

export function StaffHoursForm({
  staffId,
  own,
  businessDays,
}: {
  staffId: string;
  own: DayHours[] | null;
  businessDays: DayHours[];
}) {
  const [custom, setCustom] = useState(own !== null);
  const reset = useAction();

  return (
    <div className="space-y-4">
      <Card className="space-y-2 p-4" role="radiogroup" aria-label="Qual horário usar">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="mode"
            className="size-5 accent-brand"
            checked={!custom}
            onChange={() => setCustom(false)}
          />
          <span>
            <span className="block font-semibold">Mesmo horário do negócio</span>
            <span className="block text-sm text-ink-2">
              Segue Ajustes › Horário de funcionamento.
            </span>
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="radio"
            name="mode"
            className="size-5 accent-brand"
            checked={custom}
            onChange={() => setCustom(true)}
          />
          <span>
            <span className="block font-semibold">Horário próprio</span>
            <span className="block text-sm text-ink-2">
              Dias e horários só dele. O intervalo de almoço do negócio continua valendo.
            </span>
          </span>
        </label>
      </Card>

      {reset.error ? <Alert tone="danger">{reset.error}</Alert> : null}
      {reset.message ? <Alert tone="success">{reset.message}</Alert> : null}

      {custom ? (
        <HoursEditor
          initial={own ?? businessDays}
          allowBreaks={false}
          submitLabel="Salvar horário próprio"
          onSubmit={(days) => saveStaffHoursAction({ staffId, days })}
        />
      ) : own ? (
        <Button
          size="lg"
          block
          loading={reset.pending}
          onClick={() => reset.run(() => saveStaffHoursAction({ staffId, days: null }))}
        >
          Voltar ao horário do negócio
        </Button>
      ) : (
        <p className="text-sm text-ink-2">Este profissional já segue o horário do negócio.</p>
      )}
    </div>
  );
}
