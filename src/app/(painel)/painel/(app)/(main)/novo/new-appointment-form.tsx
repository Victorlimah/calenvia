"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { formatPhone, maskPhoneInput } from "@/lib/phone";
import { cn } from "@/lib/cn";
import {
  createManualAppointmentAction,
  manualSlotsAction,
  searchCustomersAction,
  type CustomerHit,
} from "../../_actions/manual";

type Props = {
  timezone: string;
  services: { id: string; name: string; duration_min: number; price_cents: number }[];
  staff: { id: string; name: string; serviceIds: string[] }[];
  initial: {
    date: string;
    time: string | null;
    staffId: string | null;
    customer?: CustomerHit | null;
  };
  /** Plano com mensagens automáticas (mostra a opção de desligar, CAL-111). */
  automaticMessages?: boolean;
};

export function NewAppointmentForm({ services, staff, initial, automaticMessages }: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0].id);
  const eligible = useMemo(
    () => staff.filter((s) => s.serviceIds.includes(serviceId)),
    [staff, serviceId],
  );
  const [staffId, setStaffId] = useState<string>(
    initial.staffId && staff.some((s) => s.id === initial.staffId) ? initial.staffId : "",
  );
  const [date, setDate] = useState(initial.date);
  const [slots, setSlots] = useState<{ time: string; start: string }[] | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [wantedTime, setWantedTime] = useState<string | null>(initial.time);
  const [customer, setCustomer] = useState<CustomerHit | null>(initial.customer ?? null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [noAutomatic, setNoAutomatic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Profissional escolhido precisa fazer o serviço.
  useEffect(() => {
    if (staffId && !eligible.some((s) => s.id === staffId)) setStaffId("");
  }, [eligible, staffId]);

  useEffect(() => {
    let alive = true;
    setSlots(null);
    setStart(null);
    manualSlotsAction({ serviceId, staffId: staffId || null, date }).then((r) => {
      if (!alive) return;
      const list = r.ok ? (r.data?.slots ?? []) : [];
      setSlots(list);
      if (wantedTime) {
        const match = list.find((s) => s.time === wantedTime);
        if (match) setStart(match.start);
        setWantedTime(null);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, staffId, date]);

  useEffect(() => {
    if (customer || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => searchCustomersAction(query).then(setHits), 300);
    return () => clearTimeout(t);
  }, [query, customer]);

  const service = services.find((s) => s.id === serviceId)!;

  function submit() {
    setError(null);
    if (!start) return setError("Escolha um horário.");
    if (!customer && (!newName.trim() || !newPhone.trim()))
      return setError("Escolha um cliente ou informe nome e WhatsApp.");
    startTransition(async () => {
      const r = await createManualAppointmentAction({
        serviceId,
        staffId: staffId || null,
        start,
        customerId: customer?.id ?? null,
        customer: customer ? null : { name: newName, whatsapp: newPhone },
        notes,
        sendConfirmation,
        messagesEnabled: !noAutomatic,
      });
      if (r.ok && r.data)
        router.push(
          `/agendamento/${r.data.id}?${r.data.needsManualConfirmation ? "enviar=1" : "criado=1"}`,
        );
      else if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Field label="Serviço">
          {({ id }) => (
            <Select id={id} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatDuration(s.duration_min)} · {formatPrice(s.price_cents)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Profissional">
          {({ id }) => (
            <Select id={id} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {eligible.length > 1 ? <option value="">Sem preferência</option> : null}
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Dia">
          {({ id }) => (
            <Input
              id={id}
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          )}
        </Field>
        <div>
          <p className="mb-2 text-sm font-semibold">
            Horário ({formatDuration(service.duration_min)})
          </p>
          {slots === null ? <Spinner /> : null}
          {slots && slots.length === 0 ? (
            <p className="text-sm text-ink-2">Nenhum horário livre neste dia.</p>
          ) : null}
          {slots && slots.length ? (
            <ul className="grid grid-cols-4 gap-2" aria-label="Horários livres">
              {slots.map((s) => (
                <li key={s.start}>
                  <button
                    type="button"
                    aria-pressed={start === s.start}
                    onClick={() => setStart(s.start)}
                    className={cn(
                      "min-h-11 w-full rounded-xl border text-sm font-semibold",
                      start === s.start
                        ? "border-brand bg-brand text-white"
                        : "border-line bg-white",
                    )}
                  >
                    {s.time}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <p className="font-display text-lg font-bold">Cliente</p>
        {customer ? (
          <div className="flex items-center justify-between rounded-xl bg-paper-2 px-4 py-3">
            <div>
              <p className="font-semibold">{customer.name}</p>
              <p className="text-sm text-ink-2">{formatPhone(customer.whatsapp)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <Field label="Buscar cliente" hint="Digite o nome ou parte do telefone.">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              )}
            </Field>
            {hits.length ? (
              <ul
                className="divide-y divide-line rounded-xl border border-line"
                aria-label="Clientes encontrados"
              >
                {hits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex min-h-12 w-full items-center justify-between px-4 text-left hover:bg-paper-2"
                      onClick={() => setCustomer(h)}
                    >
                      <span className="font-semibold">{h.name}</span>
                      <span className="text-sm text-ink-2">{formatPhone(h.whatsapp)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm font-semibold text-ink-2">Ou cadastre um cliente novo</p>
            <Field label="Nome do cliente">
              {({ id }) => (
                <Input id={id} value={newName} onChange={(e) => setNewName(e.target.value)} />
              )}
            </Field>
            <Field label="WhatsApp do cliente">
              {({ id }) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 0 0000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(maskPhoneInput(e.target.value))}
                />
              )}
            </Field>
          </>
        )}
        <Field label="Observações (opcional)">
          {({ id }) => (
            <Textarea
              id={id}
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>
      </Card>

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-brand"
          checked={sendConfirmation}
          onChange={(e) => setSendConfirmation(e.target.checked)}
        />
        Enviar confirmação ao cliente no WhatsApp
      </label>
      {automaticMessages ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-brand"
            checked={noAutomatic}
            onChange={(e) => setNoAutomatic(e.target.checked)}
          />
          Não enviar mensagens automáticas para este agendamento
        </label>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="lg" block loading={pending} onClick={submit}>
        Agendar
      </Button>
    </div>
  );
}
