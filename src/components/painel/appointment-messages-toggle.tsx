"use client";

import { useEffect, useState } from "react";
import { setAppointmentMessagesAction } from "@/app/(painel)/painel/(app)/_actions/message-settings";
import { useAction } from "@/components/painel/use-action";
import { Alert } from "@/components/ui";

/** "Não enviar mensagens automáticas para este agendamento" (CAL-111). */
export function AppointmentMessagesToggle({
  appointmentId,
  enabled,
}: {
  appointmentId: string;
  enabled: boolean;
}) {
  const { run, pending, error, message } = useAction();
  const [on, setOn] = useState(enabled);
  // Se o servidor recusar, volta ao valor salvo.
  useEffect(() => {
    if (error) setOn(enabled);
  }, [error, enabled]);
  return (
    <div className="space-y-2">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-line bg-white px-4 py-2">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={!on}
          disabled={pending}
          onChange={(e) => {
            const next = !e.target.checked;
            setOn(next); // muda na hora; volta se o servidor recusar
            run(() => setAppointmentMessagesAction({ appointmentId, enabled: next }));
          }}
        />
        <span>
          <span className="block font-semibold">
            Não enviar mensagens automáticas para este agendamento
          </span>
          <span className="block text-sm text-ink-2">
            Sem confirmação, lembrete nem aviso de cancelamento automáticos. Você ainda pode mandar
            pelo seu WhatsApp.
          </span>
        </span>
      </label>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </div>
  );
}
