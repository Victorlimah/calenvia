"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { InviteLink } from "@/lib/admin/owner-invitations";
import { SEGMENTS } from "@/lib/business/segments";
import { maskPhoneInput } from "@/lib/phone";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { createOwnerInviteAction } from "./actions";
import { InviteLinkCard } from "./invite-link-card";

type Values = {
  businessName: string;
  segment: string;
  ownerName: string;
  email: string;
  whatsapp: string;
  plan: string;
  messageLimitOverride: string;
  memberLimitOverride: string;
  starterServices: boolean;
};

const DEFAULTS: Values = {
  businessName: "",
  segment: "",
  ownerName: "",
  email: "",
  whatsapp: "",
  plan: "pro",
  messageLimitOverride: "",
  memberLimitOverride: "",
  starterServices: true,
};

/** "Convidar negócio" (CAL-136): pré-cadastro + link de convite. */
export function InviteForm() {
  const { run, pending, error, fieldErrors } = useAction();
  const [created, setCreated] = useState<InviteLink | null>(null);
  const form = useForm<Values>({ defaultValues: DEFAULTS });

  const onSubmit = form.handleSubmit((values) =>
    run(() => createOwnerInviteAction(values), {
      onSuccess: (r) => {
        if (r.data) setCreated(r.data);
        form.reset(DEFAULTS);
      },
    }),
  );

  return (
    <div className="space-y-4">
      {created ? (
        <>
          <Alert tone="success" title="Convite criado">
            O negócio já está ativo, sem cobrança. Mande o link para o dono terminar a configuração.
          </Alert>
          <InviteLinkCard invite={created} />
          <Button type="button" variant="outline" size="sm" onClick={() => setCreated(null)}>
            Convidar outro negócio
          </Button>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do negócio" error={fieldErrors.businessName}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("businessName")}
                />
              )}
            </Field>
            <Field label="Segmento" error={fieldErrors.segment}>
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("segment")}
                >
                  <option value="">Escolha…</option>
                  {SEGMENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nome do dono" error={fieldErrors.ownerName}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  autoComplete="off"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("ownerName")}
                />
              )}
            </Field>
            <Field label="E-mail do dono" error={fieldErrors.email}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("email")}
                />
              )}
            </Field>
            <Field label="WhatsApp do negócio" error={fieldErrors.whatsapp}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  placeholder="(00) 0 0000-0000"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("whatsapp", {
                    onChange: (e) => form.setValue("whatsapp", maskPhoneInput(e.target.value)),
                  })}
                />
              )}
            </Field>
            <Field label="Plano" error={fieldErrors.plan}>
              {({ id, describedBy, invalid }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...form.register("plan")}
                >
                  {PLAN_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {PLANS[p].name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <details className="rounded-[var(--radius-control)] border border-line bg-white p-3">
            <summary className="min-h-11 cursor-pointer content-center font-semibold text-ink">
              Limites (opcional)
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field
                label="Cota de mensagens por mês"
                hint="Vazio = padrão do plano."
                error={fieldErrors.messageLimitOverride}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...form.register("messageLimitOverride")}
                  />
                )}
              </Field>
              <Field
                label="Pessoas com acesso ao painel"
                hint="Vazio = padrão do plano."
                error={fieldErrors.memberLimitOverride}
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    {...form.register("memberLimitOverride")}
                  />
                )}
              </Field>
            </div>
          </details>

          <label className="flex min-h-11 items-center gap-3 text-ink">
            <input type="checkbox" className="size-5" {...form.register("starterServices")} />
            Criar serviços iniciais do segmento (só nome e duração; o dono ajusta os preços)
          </label>

          <Button type="submit" loading={pending}>
            Criar negócio e gerar convite
          </Button>
        </form>
      )}
    </div>
  );
}
