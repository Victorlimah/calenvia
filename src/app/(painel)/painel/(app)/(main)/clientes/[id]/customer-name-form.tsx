"use client";

import { useState } from "react";
import { renameCustomerAction } from "@/app/(painel)/painel/(app)/_actions/customers";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function CustomerNameForm({ customerId, name }: { customerId: string; name: string }) {
  const [value, setValue] = useState(name);
  const { run, pending, error, message } = useAction();
  return (
    <Card className="space-y-3">
      <Field label="Nome do cliente">
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={80}
          />
        )}
      </Field>
      <Button
        variant="outline"
        loading={pending}
        disabled={value.trim() === name || value.trim().length < 2}
        onClick={() => run(() => renameCustomerAction({ customerId, name: value }))}
      >
        Salvar nome
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}
