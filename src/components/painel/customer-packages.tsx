"use client";

import { useState } from "react";
import { sellPackageAction } from "@/app/(painel)/painel/(app)/_actions/packages";
import { useAction } from "@/components/painel/use-action";
import { Alert, Badge, Button, Card, Field, Select } from "@/components/ui";
import { formatPrice } from "@/lib/money";
import { packageState, remainingSessions, type CustomerPackage } from "@/lib/packages";

const STATE = {
  active: { label: "Ativo", tone: "success" as const },
  expired: { label: "Vencido", tone: "warning" as const },
  used_up: { label: "Usado", tone: "neutral" as const },
};

/** Pacotes do cliente e venda de um novo (CAL-105). */
export function CustomerPackages({
  customerId,
  owned,
  available,
}: {
  customerId: string;
  owned: CustomerPackage[];
  available: { id: string; name: string; price_cents: number }[];
}) {
  const [pick, setPick] = useState(available[0]?.id ?? "");
  const { run, pending, error, message } = useAction();
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-bold">Pacotes</h2>
      {owned.length ? (
        <ul className="space-y-2">
          {owned.map((p) => {
            const st = STATE[packageState(p)];
            return (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{p.name}</strong> · {remainingSessions(p)} de {p.sessions_total} restantes
                  {p.expires_at
                    ? ` · vence ${new Date(p.expires_at).toLocaleDateString("pt-BR")}`
                    : ""}
                </span>
                <Badge tone={st.tone}>{st.label}</Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">Nenhum pacote.</p>
      )}
      {available.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Vender pacote" className="min-w-0 flex-1">
            {({ id }) => (
              <Select id={id} value={pick} onChange={(e) => setPick(e.target.value)}>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatPrice(p.price_cents)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button
            variant="outline"
            loading={pending}
            onClick={() => run(() => sellPackageAction({ customerId, packageId: pick }))}
          >
            Vender
          </Button>
        </div>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}
