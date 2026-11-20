"use client";

import { useState, useTransition } from "react";
import { joinWaitlistAction } from "@/app/(negocio)/[slug]/agendar/actions";
import { maskPhoneInput } from "@/lib/phone";
import { PERIOD_OPTIONS } from "@/lib/waitlist";

const input =
  "block min-h-12 w-full rounded-[var(--radius-control)] border border-t-text/20 bg-t-text/5 px-4 text-base text-t-text";

/** Lista de espera (CAL-104) no passo de horários. */
export function WaitlistForm({
  slug,
  serviceId,
  staffId,
  defaultDate,
  minDate,
  maxDate,
}: {
  slug: string;
  serviceId: string;
  staffId: string | null;
  /** Não é mais usado: as cores vêm do tema (CAL-150). */
  accent?: string;
  defaultDate: string;
  minDate: string;
  maxDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [period, setPeriod] = useState("any");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-card)] border border-t-text/10 bg-t-text/5 p-4"
      >
        Pronto! Você está na lista de espera. Se abrir um horário nesse dia, o estabelecimento te
        avisa pelo WhatsApp.
      </p>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-t-text/20 font-semibold"
      >
        Não achou horário? Entrar na lista de espera
      </button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-[var(--radius-card)] border border-t-text/10 bg-t-text/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await joinWaitlistAction({
            slug,
            serviceId,
            staffId,
            date,
            period,
            name,
            whatsapp,
          });
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
    >
      <h2 className="font-t-display text-lg font-bold">Lista de espera</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Dia que você quer</span>
          <input
            type="date"
            className={input}
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Período</span>
          <select className={input} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="text-ink">
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm font-semibold">
        <span className="block">Seu nome</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        <span className="block">Seu WhatsApp (espera)</span>
        <input
          type="tel"
          inputMode="tel"
          className={input}
          placeholder="(00) 0 0000-0000"
          value={whatsapp}
          onChange={(e) => setWhatsapp(maskPhoneInput(e.target.value))}
          required
        />
      </label>
      {error ? (
        <p role="alert" className="font-semibold text-red-300">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] font-bold disabled:opacity-60"
        style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
      >
        {pending ? "Enviando…" : "Me avise se abrir vaga"}
      </button>
    </form>
  );
}
