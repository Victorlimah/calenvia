"use client";

import { useEffect, useState } from "react";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, Field, Select, Spinner } from "@/components/ui";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
  rescheduleSlotsAction,
  setAppointmentStatusAction,
} from "../../../_actions/appointments";

type Props = {
  appointment: { id: string; status: string; date: string; staffId: string; isPast: boolean };
  /** Remarcar e cancelar (CAL-112: o profissional só marca concluído/faltou). */
  canManage?: boolean;
  staff: { id: string; name: string }[];
};

export function AppointmentActions({ appointment, staff, canManage = true }: Props) {
  const status = useAction();
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const canceled = appointment.status === "canceled";

  return (
    <div className="space-y-3">
      {status.error ? <Alert tone="danger">{status.error}</Alert> : null}
      {status.message ? <Alert tone="success">{status.message}</Alert> : null}

      {!canceled ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={appointment.status === "completed" ? "secondary" : "outline"}
            loading={status.pending}
            onClick={() =>
              status.run(() =>
                setAppointmentStatusAction(
                  appointment.id,
                  appointment.status === "completed" ? "confirmed" : "completed",
                ),
              )
            }
          >
            {appointment.status === "completed" ? "Desfazer concluído" : "Concluído"}
          </Button>
          <Button
            variant={appointment.status === "no_show" ? "secondary" : "outline"}
            loading={status.pending}
            onClick={() =>
              status.run(() =>
                setAppointmentStatusAction(
                  appointment.id,
                  appointment.status === "no_show" ? "confirmed" : "no_show",
                ),
              )
            }
          >
            {appointment.status === "no_show" ? "Desfazer falta" : "Faltou"}
          </Button>
          {canManage ? (
            <>
              <Button variant="outline" onClick={() => setRescheduling((v) => !v)}>
                Remarcar
              </Button>
              <Button
                variant="outline"
                className="text-danger"
                onClick={() => setConfirmCancel(true)}
              >
                Cancelar
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {confirmCancel && !canceled ? (
        <Card
          className="space-y-3 border-danger/40"
          role="alertdialog"
          aria-labelledby="cancelar-titulo"
        >
          <p id="cancelar-titulo" className="font-semibold">
            Cancelar este agendamento?
          </p>
          <p className="text-sm text-ink-2">O horário volta a ficar livre na sua página.</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              loading={status.pending}
              onClick={() =>
                status.run(() => cancelAppointmentAction(appointment.id), {
                  onSuccess: () => setConfirmCancel(false),
                })
              }
            >
              Sim, cancelar
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Voltar
            </Button>
          </div>
        </Card>
      ) : null}

      {rescheduling && !canceled ? (
        <ReschedulePanel
          appointment={appointment}
          staff={staff}
          onDone={() => setRescheduling(false)}
        />
      ) : null}
    </div>
  );
}

function ReschedulePanel({
  appointment,
  staff,
  onDone,
}: {
  appointment: Props["appointment"];
  staff: Props["staff"];
  onDone: () => void;
}) {
  const [date, setDate] = useState(appointment.date);
  const [staffId, setStaffId] = useState<string>(appointment.staffId);
  const [slots, setSlots] = useState<{ time: string; start: string }[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const save = useAction();

  useEffect(() => {
    let alive = true;
    setSlots(null);
    setChosen(null);
    setLoadError(null);
    rescheduleSlotsAction({ appointmentId: appointment.id, date, staffId: staffId || null }).then(
      (r) => {
        if (!alive) return;
        if (r.ok) setSlots(r.data?.slots ?? []);
        else setLoadError(r.error);
      },
    );
    return () => {
      alive = false;
    };
  }, [appointment.id, date, staffId]);

  return (
    <Card className="space-y-4 border-brand-soft">
      <p className="font-display text-lg font-bold">Remarcar</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Novo dia">
          {({ id }) => (
            <input
              id={id}
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="block min-h-12 w-full rounded-[var(--radius-control)] border border-line bg-white px-3"
            />
          )}
        </Field>
        <Field label="Profissional">
          {({ id }) => (
            <Select id={id} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
      {slots === null && !loadError ? <Spinner /> : null}
      {slots && slots.length === 0 ? (
        <p className="text-sm text-ink-2">Nenhum horário livre neste dia.</p>
      ) : null}
      {slots && slots.length ? (
        <ul className="grid grid-cols-4 gap-2" aria-label="Horários livres para remarcar">
          {slots.map((s) => (
            <li key={s.start}>
              <button
                type="button"
                aria-pressed={chosen === s.start}
                onClick={() => setChosen(s.start)}
                className={`min-h-11 w-full rounded-xl border text-sm font-semibold ${chosen === s.start ? "border-brand bg-brand text-white" : "border-line bg-white"}`}
              >
                {s.time}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {save.error ? <Alert tone="danger">{save.error}</Alert> : null}
      <div className="flex gap-2">
        <Button
          disabled={!chosen}
          loading={save.pending}
          onClick={() =>
            chosen &&
            save.run(
              () =>
                rescheduleAppointmentAction({
                  appointmentId: appointment.id,
                  start: chosen,
                  staffId,
                }),
              {
                onSuccess: onDone,
              },
            )
          }
        >
          Confirmar novo horário
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Fechar
        </Button>
      </div>
    </Card>
  );
}
