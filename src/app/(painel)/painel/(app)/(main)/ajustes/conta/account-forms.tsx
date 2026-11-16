"use client";

import { useState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { useAction } from "@/components/painel/use-action";
import {
  updateAccountEmailAction,
  updateAccountNameAction,
} from "@/app/(painel)/painel/(app)/_actions/account";

export function AccountNameForm({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const { run, pending, error, message, fieldErrors } = useAction();
  return (
    <Card>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateAccountNameAction({ name: value }));
        }}
      >
        <h2 className="font-display text-xl font-bold">Seu nome</h2>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Field label="Nome" hint="Aparece para a sua equipe." error={fieldErrors.name}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={value}
              autoComplete="name"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" loading={pending}>
          Salvar nome
        </Button>
      </form>
    </Card>
  );
}

export function AccountEmailForm({ email }: { email: string }) {
  const [value, setValue] = useState("");
  const { run, pending, error, message, fieldErrors } = useAction();
  return (
    <Card>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(() => updateAccountEmailAction({ email: value }), { refresh: false });
        }}
      >
        <h2 className="font-display text-xl font-bold">E-mail de acesso</h2>
        <p className="text-ink-2">
          Hoje você entra com <strong className="text-ink">{email}</strong>.
        </p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
        <Field label="Novo e-mail" error={fieldErrors.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              value={value}
              autoComplete="email"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="outline" loading={pending}>
          Trocar e-mail
        </Button>
      </form>
    </Card>
  );
}
