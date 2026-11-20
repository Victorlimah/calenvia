"use client";

import { useId, useState, useTransition } from "react";
import { requestAccessAction } from "@/app/(site)/actions";
import { SEGMENTS } from "@/lib/business/segments";
import { maskPhoneInput } from "@/lib/phone";

/** Formulário da lista de espera da home (CAL-138). Sem dependências de UI do painel. */
export function AccessRequestForm() {
  const uid = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  if (done) {
    return (
      <p className="access-done" role="status">
        {done}
      </p>
    );
  }

  const field = (name: string, label: string, input: React.ReactNode) => (
    <div className="access-field">
      <label htmlFor={`${uid}-${name}`}>{label}</label>
      {input}
      {fieldErrors[name] ? (
        <p className="access-error" id={`${uid}-${name}-erro`}>
          {fieldErrors[name]}
        </p>
      ) : null}
    </div>
  );
  const describe = (name: string) =>
    fieldErrors[name] ? { "aria-invalid": true, "aria-describedby": `${uid}-${name}-erro` } : {};

  return (
    <form
      className="access-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        setError(null);
        setFieldErrors({});
        start(async () => {
          const r = await requestAccessAction(data);
          if (r.ok) setDone(r.message ?? "Recebemos seu pedido!");
          else {
            setError(r.error);
            setFieldErrors(r.fieldErrors ?? {});
          }
        });
      }}
    >
      {error ? (
        <p className="access-error" role="alert">
          {error}
        </p>
      ) : null}
      {field(
        "name",
        "Seu nome",
        <input id={`${uid}-name`} name="name" autoComplete="name" {...describe("name")} />,
      )}
      {field(
        "businessName",
        "Nome do negócio",
        <input
          id={`${uid}-businessName`}
          name="businessName"
          autoComplete="organization"
          {...describe("businessName")}
        />,
      )}
      {field(
        "whatsapp",
        "WhatsApp",
        <input
          id={`${uid}-whatsapp`}
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 0 0000-0000"
          value={phone}
          onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
          {...describe("whatsapp")}
        />,
      )}
      {field(
        "segment",
        "Tipo de negócio (opcional)",
        <select id={`${uid}-segment`} name="segment" defaultValue="">
          <option value="">Escolha…</option>
          {SEGMENTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>,
      )}
      {/* Campo-isca contra robôs: fora da tela e fora da ordem do teclado. */}
      <div className="access-hp" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Site</label>
        <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Enviando…" : "Entrar na lista de espera"}
      </button>
    </form>
  );
}
