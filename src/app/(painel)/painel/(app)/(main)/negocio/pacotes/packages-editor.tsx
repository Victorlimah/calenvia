"use client";

import { useState } from "react";
import {
  createPackageAction,
  togglePackageAction,
} from "@/app/(painel)/painel/(app)/_actions/packages";
import { useAction } from "@/components/painel/use-action";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { formatPrice, parsePriceToCents } from "@/lib/money";
import { packageSavings } from "@/lib/packages";

type Service = { id: string; name: string; price_cents: number };
type Pkg = {
  id: string;
  service_id: string;
  name: string;
  sessions: number;
  price_cents: number;
  validity_days: number | null;
  is_active: boolean;
};

const VALIDITY = [
  { v: 0, l: "Sem validade" },
  { v: 30, l: "30 dias" },
  { v: 60, l: "60 dias" },
  { v: 90, l: "90 dias" },
  { v: 180, l: "6 meses" },
  { v: 365, l: "1 ano" },
];

export function PackagesEditor({ services, packages }: { services: Service[]; packages: Pkg[] }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [sessions, setSessions] = useState("4");
  const [price, setPrice] = useState("");
  const [validity, setValidity] = useState("90");
  const service = services.find((s) => s.id === serviceId);
  const [name, setName] = useState("");
  const { run, pending, error, message, fieldErrors } = useAction();
  const cents = parsePriceToCents(price);
  const savings =
    service && cents && Number(sessions) > 1
      ? packageSavings(service.price_cents, Number(sessions), cents)
      : null;

  return (
    <div className="space-y-4">
      {packages.length ? (
        <ul className="space-y-2">
          {packages.map((p) => {
            const s = services.find((x) => x.id === p.service_id);
            return (
              <li key={p.id}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {p.name} {!p.is_active ? <Badge>Desativado</Badge> : null}
                    </p>
                    <p className="text-sm text-ink-2">
                      {p.sessions}× {s?.name ?? "serviço"} · {formatPrice(p.price_cents)} ·{" "}
                      {p.validity_days ? `validade de ${p.validity_days} dias` : "sem validade"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => run(() => togglePackageAction(p.id, !p.is_active))}
                  >
                    {p.is_active ? "Desativar" : "Reativar"}
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Nenhum pacote ainda"
          description="Pacotes fidelizam: o cliente paga antes e volta mais vezes."
        />
      )}

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">Novo pacote</h2>
        {services.length === 0 ? (
          <p className="text-ink-2">Cadastre um serviço antes.</p>
        ) : (
          <>
            <Field label="Serviço">
              {({ id }) => (
                <Select id={id} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatPrice(s.price_cents)})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nome do pacote" hint="Ex.: Pacote 4 cortes" error={fieldErrors.name}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  value={name}
                  placeholder={service ? `Pacote ${sessions} ${service.name.toLowerCase()}` : ""}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sessões" error={fieldErrors.sessions}>
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    value={sessions}
                    onChange={(e) => setSessions(e.target.value.replace(/\D/g, ""))}
                  />
                )}
              </Field>
              <Field label="Preço (R$)" error={fieldErrors.price}>
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Validade">
                {({ id }) => (
                  <Select id={id} value={validity} onChange={(e) => setValidity(e.target.value)}>
                    {VALIDITY.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.l}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            {savings ? (
              <p className="text-sm text-ink-2">
                {formatPrice(savings.perSessionCents)} por sessão
                {savings.savingsCents
                  ? ` · o cliente economiza ${formatPrice(savings.savingsCents)}`
                  : ""}
              </p>
            ) : null}
            <Button
              loading={pending}
              onClick={() =>
                run(() =>
                  createPackageAction({
                    serviceId,
                    name: name || `Pacote ${sessions} ${service?.name.toLowerCase() ?? ""}`.trim(),
                    sessions,
                    price,
                    validityDays: validity,
                  }),
                )
              }
            >
              Criar pacote
            </Button>
          </>
        )}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}
      </Card>
    </div>
  );
}
