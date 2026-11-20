"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, Input } from "@/components/ui";
import { siteUrl } from "@/lib/hosts";
import { acceptOwnerInvitationAction } from "./owner-actions";

type Values = { password: string; confirm: string };

/** Criar a senha (conta nova) ou confirmar a senha da conta que já existe (CAL-137). */
export function OwnerAcceptForm({
  token,
  email,
  hasAccount,
}: {
  token: string;
  email: string;
  hasAccount: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const form = useForm<Values>({ defaultValues: { password: "", confirm: "" } });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await acceptOwnerInvitationAction(
        token,
        hasAccount ? { password: values.password } : values,
      );
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push(result.data?.redirectTo ?? "/onboarding");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="E-mail" hint="É o e-mail do convite. Você vai entrar com ele.">
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            aria-describedby={describedBy}
            className="bg-paper-2 text-ink-2"
          />
        )}
      </Field>
      {hasAccount ? (
        <>
          <Alert tone="info">
            Você já tem uma conta na Calenvia com esse e-mail. Digite a senha dessa conta para ligar
            o negócio a ela.
          </Alert>
          <Field label="Senha da sua conta" error={fieldErrors.password}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register("password")}
              />
            )}
          </Field>
        </>
      ) : (
        <>
          <Field
            label="Crie uma senha"
            hint="Pelo menos 8 caracteres."
            error={fieldErrors.password}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register("password")}
              />
            )}
          </Field>
          <Field label="Repita a senha" error={fieldErrors.confirm}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...form.register("confirm")}
              />
            )}
          </Field>
        </>
      )}
      <Button type="submit" size="lg" block loading={pending}>
        {hasAccount ? "Entrar e aceitar o convite" : "Criar senha e começar"}
      </Button>
      <p className="text-center text-xs text-muted">
        Ao continuar você concorda com os{" "}
        <a href={siteUrl("/termos")} className="underline">
          Termos
        </a>{" "}
        e a{" "}
        <a href={siteUrl("/privacidade")} className="underline">
          Política de Privacidade
        </a>
        .
      </p>
    </form>
  );
}
