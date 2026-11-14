"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, Input } from "@/components/ui";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.ok) setMessage(result.message ?? null);
      else setError(result.error);
    });
  });

  if (message) return <Alert tone="success">{message}</Alert>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="E-mail da conta" error={errors.email?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("email")}
          />
        )}
      </Field>
      <Button type="submit" size="lg" block loading={pending}>
        Enviar link
      </Button>
    </form>
  );
}
