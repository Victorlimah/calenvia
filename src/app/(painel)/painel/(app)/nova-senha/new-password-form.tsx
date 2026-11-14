"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, ButtonLink, Field, Input } from "@/components/ui";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validation/auth";
import { updatePasswordAction } from "../../(auth)/actions";

export function NewPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const form = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  });

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">Pronto! Sua senha foi alterada.</Alert>
        <ButtonLink href="/" block size="lg">
          Ir para a agenda
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Nova senha" hint="Pelo menos 8 caracteres." error={errors.password?.message}>
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
      <Field label="Repita a nova senha" error={errors.confirm?.message}>
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
      <Button type="submit" size="lg" block loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
