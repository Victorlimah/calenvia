"use client";

import { useState } from "react";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { createBlockAction, deleteBlockAction } from "../../_actions/blocks";

export function BlockForm({
  staff,
  date,
}: {
  staff: { id: string; name: string }[];
  date: string;
}) {
  const { run, pending, error, message } = useAction();
  const [staffId, setStaffId] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  return (
    <Card className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? (
        <Alert tone={message.includes("Atenção") ? "warning" : "success"}>{message}</Alert>
      ) : null}
      <Field label="Quem">
        {({ id }) => (
          <Select id={id} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        Dia inteiro
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="De (dia)">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (e.target.value > endDate) setEndDate(e.target.value);
              }}
            />
          )}
        </Field>
        {!allDay ? (
          <Field label="Das">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            )}
          </Field>
        ) : (
          <div />
        )}
        <Field label="Até (dia)">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          )}
        </Field>
        {!allDay ? (
          <Field label="Às">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                step={900}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            )}
          </Field>
        ) : null}
      </div>
      <Field label="Motivo (opcional)" hint="Só você vê.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            maxLength={120}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: consulta médica"
          />
        )}
      </Field>
      <Button
        block
        size="lg"
        loading={pending}
        onClick={() =>
          run(() =>
            createBlockAction({
              staffId: staffId || null,
              startDate,
              endDate,
              allDay,
              startTime: allDay ? undefined : startTime,
              endTime: allDay ? undefined : endTime,
              reason,
            }),
          )
        }
      >
        Bloquear
      </Button>
    </Card>
  );
}

export function BlockList({
  blocks,
}: {
  blocks: { id: string; who: string; when: string; reason: string | null }[];
}) {
  const del = useAction();
  return (
    <section aria-label="Próximos bloqueios" className="space-y-2">
      <h2 className="font-display text-lg font-bold">Próximos bloqueios</h2>
      {blocks.length === 0 ? (
        <EmptyState title="Nenhum bloqueio" description="Seus próximos bloqueios aparecem aqui." />
      ) : null}
      <ul className="space-y-2">
        {blocks.map((b) => (
          <li
            key={b.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{b.when}</p>
              <p className="text-ink-2">
                {b.who}
                {b.reason ? ` · ${b.reason}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              onClick={() => del.run(() => deleteBlockAction(b.id))}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
