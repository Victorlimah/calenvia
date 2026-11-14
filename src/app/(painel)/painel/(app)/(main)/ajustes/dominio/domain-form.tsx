"use client";

import { useState } from "react";
import {
  removeDomainAction,
  saveDomainAction,
  verifyDomainAction,
} from "@/app/(painel)/painel/(app)/_actions/domains";
import { useAction } from "@/components/painel/use-action";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";

export function DomainForm({
  current,
  verified,
  lastError,
}: {
  current: string | null;
  verified: boolean;
  lastError: string | null;
}) {
  const [domain, setDomain] = useState(current ?? "");
  const { run, pending, error, message, fieldErrors } = useAction();

  return (
    <Card className="space-y-4">
      {current ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold break-all">{current}</p>
          <Badge tone={verified ? "success" : "warning"}>
            {verified ? "Funcionando" : "Aguardando DNS"}
          </Badge>
        </div>
      ) : null}
      {!verified && lastError && !error && !message ? (
        <Alert tone="warning">{lastError}</Alert>
      ) : null}
      <Field label="Seu domínio" hint="Ex.: agenda.seunegocio.com.br" error={fieldErrors.domain}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button loading={pending} onClick={() => run(() => saveDomainAction({ domain }))}>
          {current ? "Salvar domínio" : "Usar este domínio"}
        </Button>
        {current && !verified ? (
          <Button
            variant="outline"
            loading={pending}
            onClick={() => run(() => verifyDomainAction())}
          >
            Verificar agora
          </Button>
        ) : null}
        {current ? (
          <Button variant="ghost" onClick={() => run(() => removeDomainAction())}>
            Remover domínio
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}
