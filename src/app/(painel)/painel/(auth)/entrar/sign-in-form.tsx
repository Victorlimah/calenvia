"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, Button, Field, Input } from "@/components/ui";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";
import { signInAction } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await signInAction(values, next);
      if (!result.ok) setError(result.error);
      else {
        router.push(result.data?.redirectTo ?? "/");
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
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
      <Field label="Senha" error={errors.password?.message}>
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
      <div className="text-right">
        <Link
          href="/recuperar-senha"
          className="text-brand inline-flex min-h-11 items-center text-sm font-semibold"
        >
          Esqueci minha senha
        </Link>
      </div>
      <Button type="submit" size="lg" block loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
