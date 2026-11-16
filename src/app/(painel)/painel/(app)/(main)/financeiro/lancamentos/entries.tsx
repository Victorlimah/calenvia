"use client";

import { useState } from "react";
import {
  addFinanceEntryAction,
  deleteFinanceEntryAction,
} from "@/app/(painel)/painel/(app)/_actions/finance";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type FinanceEntry } from "@/lib/finance/summary";
import { formatPrice } from "@/lib/money";

export function EntryForm({ defaultDate }: { defaultDate: string }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const { run, pending, error, message, fieldErrors } = useAction();
  const cats = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-bold">Novo lançamento</h2>
      <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-2">
        {(["expense", "income"] as const).map((k) => (
          <label
            key={k}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border font-semibold ${kind === k ? "border-brand bg-brand-50 text-brand" : "border-line"}`}
          >
            <input
              type="radio"
              name="kind"
              className="sr-only"
              checked={kind === k}
              onChange={() => {
                setKind(k);
                setCategory(k === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
              }}
            />
            {k === "expense" ? "Despesa" : "Receita"}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" error={fieldErrors.amount}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
        <Field label="Data" error={fieldErrors.occurred_on}>
          {({ id }) => (
            <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>
      </div>
      <Field label="Categoria">
        {({ id }) => (
          <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Descrição (opcional)">
        {({ id }) => (
          <Input
            id={id}
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </Field>
      <Button
        block
        loading={pending}
        onClick={() =>
          run(
            () => addFinanceEntryAction({ kind, amount, category, description, occurred_on: date }),
            {
              onSuccess: () => {
                setAmount("");
                setDescription("");
              },
            },
          )
        }
      >
        Lançar
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}

export function EntryList({ entries }: { entries: FinanceEntry[] }) {
  const { run, pending } = useAction();
  if (!entries.length) {
    return (
      <EmptyState
        title="Nenhum lançamento neste mês"
        description="Lance despesas (aluguel, produtos…) e receitas avulsas para ver o saldo real."
      />
    );
  }
  return (
    <section aria-labelledby="lancamentos" className="space-y-2">
      <h2 id="lancamentos" className="font-display text-lg font-bold">
        Lançamentos
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {e.category}
                {e.description ? (
                  <span className="font-normal text-ink-2"> · {e.description}</span>
                ) : null}
              </p>
              <p className="text-sm text-ink-2">{e.occurred_on.split("-").reverse().join("/")}</p>
            </div>
            <p className={`font-semibold ${e.kind === "expense" ? "text-danger" : "text-success"}`}>
              {e.kind === "expense" ? "− " : "+ "}
              {formatPrice(e.amount_cents)}
            </p>
            <button
              type="button"
              disabled={pending}
              aria-label={`Remover ${e.category} de ${formatPrice(e.amount_cents)}`}
              onClick={() => run(() => deleteFinanceEntryAction(e.id))}
              className="inline-flex size-11 items-center justify-center rounded-xl text-ink-2 hover:bg-paper-2"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
