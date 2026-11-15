"use client";

import { useState } from "react";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";
import { changePriceAction, createAddonAction, setAddonActiveAction } from "../billing-actions";

type Target = { product: "plan"; plan: PlanId } | { product: "addon"; addonId: string };

export function PriceForm({ target, label }: { target: Target; label: string }) {
  const { run, pending, error, message } = useAction();
  const [amount, setAmount] = useState("");
  const [apply, setApply] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => changePriceAction({ target, amount, applyToExisting: apply }), {
          onSuccess: () => {
            setAmount("");
            setApply(false);
          },
        });
      }}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Field label={`Novo preço de ${label} (R$)`}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            inputMode="decimal"
            placeholder="49,90"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        )}
      </Field>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={apply}
          onChange={(e) => setApply(e.target.checked)}
          className="size-5"
        />
        Aplicar também a quem já assina
      </label>
      <Button type="submit" size="sm" variant="outline" loading={pending} disabled={!amount}>
        Mudar preço
      </Button>
    </form>
  );
}

export function AddonActiveButton({ addonId, active }: { addonId: string; active: boolean }) {
  const { run, pending, error } = useAction();
  return (
    <div className="space-y-2">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        size="sm"
        variant="ghost"
        loading={pending}
        onClick={() => run(() => setAddonActiveAction(addonId, !active))}
      >
        {active ? "Arquivar extra" : "Voltar ao catálogo"}
      </Button>
    </div>
  );
}

export function NewAddonForm() {
  const { run, pending, error, message, fieldErrors } = useAction();
  const [form, setForm] = useState({
    name: "",
    description: "",
    kind: "messages" as "messages" | "members",
    unitAmount: "100",
    amount: "",
    plans: ["pro", "pro_plus"] as PlanId[],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createAddonAction(form), {
          onSuccess: () => setForm((f) => ({ ...f, name: "", description: "", amount: "" })),
        });
      }}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nome" error={fieldErrors.name}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              placeholder="+500 mensagens/mês"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          )}
        </Field>
        <Field label="Valor por mês (R$)">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="decimal"
              placeholder="40,00"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          )}
        </Field>
        <Field label="O que soma">
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as "messages" | "members")}
            >
              <option value="messages">Mensagens por mês</option>
              <option value="members">Pessoas na equipe</option>
            </Select>
          )}
        </Field>
        <Field label="Quanto cada unidade soma" error={fieldErrors.unitAmount}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              inputMode="numeric"
              value={form.unitAmount}
              onChange={(e) => set("unitAmount", e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Descrição (aparece no checkout)" error={fieldErrors.description}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Planos que aceitam</legend>
        <div className="flex flex-wrap gap-4">
          {PLAN_ORDER.map((id) => (
            <label key={id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={form.plans.includes(id)}
                onChange={(e) =>
                  set(
                    "plans",
                    e.target.checked ? [...form.plans, id] : form.plans.filter((p) => p !== id),
                  )
                }
              />
              {PLANS[id].name}
            </label>
          ))}
        </div>
        {fieldErrors.plans ? <p className="text-sm text-danger">{fieldErrors.plans}</p> : null}
      </fieldset>
      <Button type="submit" loading={pending}>
        Criar extra
      </Button>
    </form>
  );
}
