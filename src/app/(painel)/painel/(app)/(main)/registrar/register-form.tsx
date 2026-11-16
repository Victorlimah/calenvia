"use client";

import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/metrics-owner/stats";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { formatPhone, maskPhoneInput } from "@/lib/phone";
import {
  registerAppointmentAction,
  searchCustomersAction,
  type CustomerHit,
} from "../../_actions/manual";

type Props = {
  today: string;
  nowTime: string;
  services: { id: string; name: string; price_cents: number }[];
  staff: { id: string; name: string; serviceIds: string[] }[];
  initialDate: string;
  initialCustomer?: CustomerHit | null;
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function RegisterForm({
  today,
  nowTime,
  services,
  staff,
  initialDate,
  initialCustomer,
}: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0].id);
  const eligible = useMemo(
    () => staff.filter((s) => s.serviceIds.includes(serviceId)),
    [staff, serviceId],
  );
  const [staffId, setStaffId] = useState(eligible[0]?.id ?? "");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(nowTime);
  const [price, setPrice] = useState(centsToInput(services[0].price_cents));
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [customer, setCustomer] = useState<CustomerHit | null>(initialCustomer ?? null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!eligible.some((s) => s.id === staffId)) setStaffId(eligible[0]?.id ?? "");
  }, [eligible, staffId]);

  useEffect(() => {
    if (customer || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => searchCustomersAction(query).then(setHits), 300);
    return () => clearTimeout(t);
  }, [query, customer]);

  function chooseService(id: string) {
    setServiceId(id);
    setPrice(centsToInput(services.find((s) => s.id === id)!.price_cents));
  }

  function submit() {
    setError(null);
    const priceCents = parsePriceToCents(price);
    if (priceCents === null) return setError("Confira o valor. Exemplo: 45,00");
    if (!staffId) return setError("Escolha o profissional.");
    if (!date || !time) return setError("Informe o dia e a hora.");
    if (!customer && name.trim().length < 2) return setError("Informe o nome do cliente.");
    startTransition(async () => {
      const r = await registerAppointmentAction({
        serviceId,
        staffId,
        date,
        time,
        priceCents,
        customerId: customer?.id ?? null,
        customerName: customer ? undefined : name,
        customerWhatsapp: customer ? undefined : phone || undefined,
        notes,
        paymentMethod: payment,
      });
      if (r.ok && r.data) router.push(`/agendamento/${r.data.id}`);
      else if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <Field label="Serviço">
          {({ id }) => (
            <Select id={id} value={serviceId} onChange={(e) => chooseService(e.target.value)}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {formatPrice(s.price_cents)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Profissional">
          {({ id }) => (
            <Select id={id} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {eligible.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                max={today}
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            )}
          </Field>
          <Field label="Hora">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                value={time}
                onChange={(e) => e.target.value && setTime(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field
          label="Valor cobrado (R$)"
          hint="Já vem o preço do serviço. Mude se cobrou diferente."
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          )}
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Forma de pagamento (opcional)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
              <label
                key={m}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border text-sm font-semibold ${
                  payment === m ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="pagamento"
                  value={m}
                  checked={payment === m}
                  onChange={() => setPayment(m)}
                  className="sr-only"
                />
                {PAYMENT_LABELS[m]}
              </label>
            ))}
          </div>
        </fieldset>
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
            <p className="text-sm font-semibold text-ink-2">Ou informe um cliente novo</p>
            <Field label="Nome do cliente">
              {({ id }) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field
              label="WhatsApp do cliente (opcional)"
              hint="Sem o número, o atendimento fica salvo como cliente avulso."
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 0 0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
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

      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="lg" block loading={pending} onClick={submit}>
        Registrar atendimento
      </Button>
    </div>
  );
}
