"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { SEGMENTS, timezoneOptions } from "@/lib/business/segments";
import type { SlugCheck } from "@/lib/business/slug-availability";
import { businessDisplayHost } from "@/lib/hosts";
import { maskPhoneInput, formatPhone } from "@/lib/phone";
import { slugify, validateSlug } from "@/lib/slug";
import { businessInfoSchema, type BusinessInfoInput } from "@/lib/validation/business";
import {
  checkSlugAction,
  saveBusinessInfoAction,
} from "@/app/(painel)/painel/(app)/_actions/business";
import { useAction } from "./use-action";

type Props = {
  defaults?: Omit<Partial<BusinessInfoInput>, "whatsapp"> & { whatsapp?: string | null };
  submitLabel: string;
  onSaved?: () => void;
};

export function BusinessInfoForm({ defaults, submitLabel, onSaved }: Props) {
  const { run, pending, error, message, fieldErrors } = useAction();
  const form = useForm<BusinessInfoInput>({
    resolver: zodResolver(businessInfoSchema, undefined, { raw: true }),
    defaultValues: {
      name: defaults?.name ?? "",
      segment: defaults?.segment ?? ("" as BusinessInfoInput["segment"]),
      address: defaults?.address ?? "",
      address_reference: defaults?.address_reference ?? "",
      whatsapp: defaults?.whatsapp ? formatPhone(defaults.whatsapp) : "",
      instagram: defaults?.instagram ?? "",
      slug: defaults?.slug ?? "",
      timezone: defaults?.timezone ?? "America/Sao_Paulo",
    },
  });
  const { errors } = form.formState;
  const slugTouched = useRef(Boolean(defaults?.slug));
  const [slugCheck, setSlugCheck] = useState<SlugCheck | null>(null);
  const [checking, setChecking] = useState(false);

  const name = form.watch("name");
  const slug = form.watch("slug");

  // Sugere o endereço a partir do nome enquanto a pessoa não mexe no campo.
  useEffect(() => {
    if (!slugTouched.current) form.setValue("slug", slugify(name ?? ""));
  }, [name, form]);

  // Verifica disponibilidade com atraso, para não chamar o servidor a cada tecla.
  useEffect(() => {
    if (!slug || validateSlug(slug)) {
      setSlugCheck(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        setSlugCheck(await checkSlugAction(slug));
      } finally {
        setChecking(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [slug]);

  const onSubmit = form.handleSubmit((values) =>
    run(() => saveBusinessInfoAction(values), { onSuccess: () => onSaved?.() }),
  );

  const slugError =
    errors.slug?.message ??
    fieldErrors.slug ??
    (slug ? (validateSlug(slug) ?? undefined) : undefined) ??
    (slugCheck && !slugCheck.available ? slugCheck.reason : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message && !onSaved ? <Alert tone="success">{message}</Alert> : null}

      <Field label="Nome do negócio" error={errors.name?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            placeholder="Ex.: Barbearia do Zé"
            {...form.register("name")}
          />
        )}
      </Field>

      <Field label="Tipo de negócio" error={errors.segment?.message}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("segment")}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {SEGMENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="WhatsApp do negócio"
        hint="Seus clientes vão falar com você por aqui."
        error={errors.whatsapp?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(00) 0 0000-0000"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("whatsapp", {
              onChange: (e) => form.setValue("whatsapp", maskPhoneInput(e.target.value)),
            })}
          />
        )}
      </Field>

      <Field label="Endereço" error={errors.address?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="street-address"
            placeholder="Rua, número, bairro, cidade"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("address")}
          />
        )}
      </Field>

      <Field label="Ponto de referência (opcional)" error={errors.address_reference?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            placeholder="Ex.: ao lado da farmácia"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("address_reference")}
          />
        )}
      </Field>

      <Field label="Instagram (opcional)" error={errors.instagram?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            placeholder="@seunegocio"
            autoCapitalize="none"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("instagram")}
          />
        )}
      </Field>

      <Field label="Fuso horário" error={errors.timezone?.message}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("timezone")}
          >
            {timezoneOptions(defaults?.timezone).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Endereço da sua página"
        error={slugError}
        hint={
          checking
            ? "Verificando…"
            : slugCheck?.available
              ? `Disponível: ${businessDisplayHost(slug)}`
              : `Sua página: ${businessDisplayHost(slug || "seu-negocio")}`
        }
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("slug", {
              onChange: (e) => {
                slugTouched.current = true;
                form.setValue("slug", e.target.value.toLowerCase().replace(/\s/g, "-"));
              },
            })}
          />
        )}
      </Field>
      {slugCheck && !slugCheck.available && slugCheck.suggestions.length ? (
        <div className="-mt-2 flex flex-wrap gap-2" aria-label="Sugestões de endereço">
          {slugCheck.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="min-h-11 rounded-full border border-line bg-white px-3 text-sm font-medium text-ink hover:border-brand"
              onClick={() => {
                slugTouched.current = true;
                form.setValue("slug", s, { shouldValidate: true });
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <Button type="submit" size="lg" block loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
