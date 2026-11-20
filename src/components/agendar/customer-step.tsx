"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { maskPhoneInput } from "@/lib/phone";
import { customerSchema, type CustomerInput } from "@/lib/validation/booking";
import { bookAction } from "@/app/(negocio)/[slug]/agendar/actions";
import { Captcha } from "./captcha";
import type { PublicService } from "./types";

const STORAGE_KEY = "calenvia:cliente";

function loadSaved(): CustomerInput | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomerInput) : null;
  } catch {
    return null;
  }
}

function save(values: CustomerInput | null) {
  try {
    if (values) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // navegador sem armazenamento: segue sem lembrar
  }
}

type Props = {
  slug: string;
  accent: string;
  service: PublicService;
  staffId: string | null;
  staffName: string;
  start: string;
  whenLabel: string;
  onConflict: () => void;
  businessName: string;
  automaticMessages: boolean;
  privacyUrl: string;
};

const inputClass =
  "block min-h-12 w-full rounded-[var(--radius-control)] border border-t-text/20 bg-t-text/5 px-4 text-base text-t-text placeholder:text-t-sub/60 focus:border-t-text/60 focus:outline-none aria-[invalid=true]:border-red-400";

export function CustomerStep({
  slug,
  accent,
  service,
  staffId,
  staffName,
  start,
  whenLabel,
  onConflict,
  businessName,
  automaticMessages,
  privacyUrl,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null);
  const [remember, setRemember] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", whatsapp: "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    const saved = loadSaved();
    if (saved) form.reset({ name: saved.name, whatsapp: maskPhoneInput(saved.whatsapp) });
  }, [form]);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    save(remember ? values : null);
    startTransition(async () => {
      const honeypot = (document.getElementById("website") as HTMLInputElement | null)?.value ?? "";
      const result = await bookAction({
        slug,
        serviceId: service.id,
        staffId,
        start,
        ...values,
        website: honeypot,
        captchaToken,
      });
      if (result.ok) {
        router.push(`/confirmado/${result.code}`);
        return;
      }
      if (result.fieldErrors) {
        for (const [k, v] of Object.entries(result.fieldErrors)) {
          if (k === "name" || k === "whatsapp") form.setError(k, { message: v });
        }
      }
      setError({
        message: result.error,
        conflict: result.code === "conflict" || result.code === "unavailable",
      });
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Captcha onToken={setCaptchaToken} />
      <div className="rounded-[var(--radius-card)] border border-t-text/10 bg-t-text/5 p-4 text-sm">
        <p className="font-t-display text-lg font-bold">{service.name}</p>
        <p className="mt-1 text-t-sub">
          {formatDuration(service.duration_min)} · {formatPrice(service.price_cents)}
        </p>
        <p className="mt-2">{staffName}</p>
        <p className="font-semibold">{whenLabel}</p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-card)] border border-red-400/40 bg-red-500/10 p-4"
        >
          <p className="font-semibold">{error.message}</p>
          {error.conflict ? (
            <button
              type="button"
              className="mt-2 min-h-11 font-semibold underline underline-offset-4"
              onClick={onConflict}
            >
              Escolher outro horário
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="cliente-nome" className="block text-sm font-semibold">
          Seu nome
        </label>
        <input
          id="cliente-nome"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "cliente-nome-erro" : undefined}
          className={inputClass}
          {...form.register("name")}
        />
        {errors.name ? (
          <p id="cliente-nome-erro" className="text-sm font-medium text-red-300">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cliente-whatsapp" className="block text-sm font-semibold">
          Seu WhatsApp
        </label>
        <input
          id="cliente-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(00) 0 0000-0000"
          aria-invalid={Boolean(errors.whatsapp)}
          aria-describedby={errors.whatsapp ? "cliente-whatsapp-erro" : "cliente-whatsapp-dica"}
          className={inputClass}
          {...form.register("whatsapp", {
            onChange: (e) => form.setValue("whatsapp", maskPhoneInput(e.target.value)),
          })}
        />
        {errors.whatsapp ? (
          <p id="cliente-whatsapp-erro" className="text-sm font-medium text-red-300">
            {errors.whatsapp.message}
          </p>
        ) : (
          <p id="cliente-whatsapp-dica" className="text-sm text-t-sub">
            É por aqui que você recebe a confirmação.
          </p>
        )}
      </div>

      {/* Campo-isca: invisível para pessoas, robôs costumam preencher. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Site</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5"
          style={{ accentColor: accent }}
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        Lembrar meus dados neste aparelho
      </label>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold disabled:opacity-60"
        style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
      >
        {pending ? "Confirmando…" : "Confirmar agendamento"}
      </button>
      <p className="text-xs leading-relaxed text-t-sub">
        Ao confirmar, a {businessName} usa seu nome e WhatsApp só para este atendimento
        {automaticMessages
          ? ", e você recebe a confirmação e o lembrete no WhatsApp (responda SAIR para parar)"
          : ""}
        .{" "}
        <a href={privacyUrl} target="_blank" rel="noopener" className="underline">
          Política de privacidade
        </a>
      </p>
    </form>
  );
}
