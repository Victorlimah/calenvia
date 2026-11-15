"use client";

import { useState } from "react";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { formatPrice } from "@/lib/money";
import {
  activateCourtesyAction,
  addBusinessAddonAction,
  setBusinessAddonQuantityAction,
} from "../../billing-actions";

export type ActiveAddon = {
  id: string;
  label: string;
  quantity: number;
  amountCents: number;
  custom: boolean;
  note: string | null;
};
export type CatalogAddon = { addonId: string; name: string; amountCents: number };

function Row({ addon }: { addon: ActiveAddon }) {
  const { run, pending, error } = useAction();
  return (
    <li className="space-y-1 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink">
          {addon.label}
          {addon.quantity > 1 ? ` × ${addon.quantity}` : ""} ·{" "}
          {formatPrice(addon.amountCents * addon.quantity)}/mês
          {addon.note ? <span className="block text-muted">{addon.note}</span> : null}
        </span>
        <span className="flex gap-1">
          {addon.custom ? null : (
            <>
              <Button
                size="sm"
                variant="outline"
                aria-label={`Menos ${addon.label}`}
                disabled={pending}
                onClick={() =>
                  run(() => setBusinessAddonQuantityAction(addon.id, addon.quantity - 1))
                }
              >
                −
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={`Mais ${addon.label}`}
                disabled={pending}
                onClick={() =>
                  run(() => setBusinessAddonQuantityAction(addon.id, addon.quantity + 1))
                }
              >
                +
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => setBusinessAddonQuantityAction(addon.id, 0))}
          >
            Remover
          </Button>
        </span>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </li>
  );
}

export function BusinessAddons({
  businessId,
  active,
  catalog,
}: {
  businessId: string;
  active: ActiveAddon[];
  catalog: CatalogAddon[];
}) {
  const add = useAction();
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [addonId, setAddonId] = useState(catalog[0]?.addonId ?? "");
  const [quantity, setQuantity] = useState("1");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      {active.length === 0 ? (
        <p className="text-muted">Nenhum extra.</p>
      ) : (
        <ul className="divide-y divide-line">
          {active.map((a) => (
            <Row key={a.id} addon={a} />
          ))}
        </ul>
      )}

      <form
        className="space-y-3 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.run(
            () =>
              addBusinessAddonAction(
                businessId,
                mode === "catalog"
                  ? { type: "catalog", addonId, quantity: Number(quantity), note }
                  : { type: "custom", label, amount, note },
              ),
            {
              onSuccess: () => {
                setLabel("");
                setAmount("");
                setNote("");
                setQuantity("1");
              },
            },
          );
        }}
      >
        {add.error ? <Alert tone="danger">{add.error}</Alert> : null}
        {add.message ? <Alert tone="success">{add.message}</Alert> : null}
        <fieldset className="flex flex-wrap gap-4">
          <legend className="sr-only">Tipo de extra</legend>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="tipo-extra"
              className="size-5"
              checked={mode === "catalog"}
              onChange={() => setMode("catalog")}
            />
            Do catálogo
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="tipo-extra"
              className="size-5"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
            />
            Combinado (valor livre)
          </label>
        </fieldset>
        {mode === "catalog" ? (
          catalog.length === 0 ? (
            <p className="text-muted">O plano deste negócio não aceita extras do catálogo.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Field label="Extra" error={add.fieldErrors.addonId}>
                {({ id, describedBy }) => (
                  <Select
                    id={id}
                    aria-describedby={describedBy}
                    value={addonId}
                    onChange={(e) => setAddonId(e.target.value)}
                  >
                    {catalog.map((c) => (
                      <option key={c.addonId} value={c.addonId}>
                        {c.name} · {formatPrice(c.amountCents)}/mês
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Quantidade" error={add.fieldErrors.quantity}>
                {({ id, describedBy }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                )}
              </Field>
            </div>
          )
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <Field label="Descrição" error={add.fieldErrors.label}>
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Treinamento da equipe"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              )}
            </Field>
            <Field label="Valor por mês (R$)">
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  inputMode="decimal"
                  placeholder="20,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              )}
            </Field>
          </div>
        )}
        <Field label="Anotação do extra (opcional)">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" size="sm" loading={add.pending}>
          Adicionar extra
        </Button>
      </form>
    </div>
  );
}

export function CourtesyButton({ businessId }: { businessId: string }) {
  const { run, pending, error, message } = useAction();
  return (
    <div className="space-y-2">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => run(() => activateCourtesyAction(businessId))}
      >
        Ativar sem cobrança (cortesia)
      </Button>
    </div>
  );
}
