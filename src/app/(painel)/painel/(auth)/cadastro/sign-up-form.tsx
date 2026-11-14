"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, Input } from "@/components/ui";
import { siteUrl } from "@/lib/hosts";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUpAction } from "../actions";

export function SignUpForm({ plan, refCode }: { plan?: string; refCode?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await signUpAction(values, plan, refCode);
      if (!result.ok) setError(result.error);
      else if (result.data?.redirectTo) {
        router.push(result.data.redirectTo);
        router.refresh();
      } else setMessage(result.message ?? null);
    });
  });

  if (message)
    return (
      <Alert tone="success" title="Quase lá!">
        {message}
      </Alert>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="Seu nome" error={errors.name?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="name"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...form.register("name")}
          />
        )}
      </Field>
      <Field label="E-mail" error={errors.email?.message}>
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
      <Field label="Senha" hint="Pelo menos 8 caracteres." error={errors.password?.message}>
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
      <Button type="submit" size="lg" block loading={pending}>
        Criar conta
      </Button>
      <p className="text-center text-xs text-muted">
        Ao criar a conta você concorda com os{" "}
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
