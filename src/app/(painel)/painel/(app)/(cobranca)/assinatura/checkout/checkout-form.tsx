"use client";

import { useMemo, useState, useTransition } from "react";
import { startCheckoutAction } from "@/app/(painel)/painel/(app)/_actions/billing";
import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/money";
import type { PlanId } from "@/lib/plans";

type PlanOption = { id: PlanId; name: string; amountCents: number; highlights: string[] };
type AddonOption = {
  addonId: string;
  name: string;
  description: string;
  amountCents: number;
  plans: PlanId[];
};

export function CheckoutForm({
  plans,
  addons,
  initialPlan,
}: {
  plans: PlanOption[];
  addons: AddonOption[];
  initialPlan: PlanId;
}) {
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = addons.filter((a) => a.plans.includes(plan));
  const current = plans.find((p) => p.id === plan)!;
  const total = useMemo(
    () =>
      current.amountCents +
      available.reduce((sum, a) => sum + (qty[a.addonId] ?? 0) * a.amountCents, 0),
    [current, available, qty],
  );

  function setQuantity(id: string, n: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(50, n)) }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await startCheckoutAction({
        plan,
        addons: available
          .filter((a) => (qty[a.addonId] ?? 0) > 0)
          .map((a) => ({ addonId: a.addonId, quantity: qty[a.addonId] ?? 0 })),
      });
      if (!result.ok) setError(result.error);
      else if (result.data) window.location.assign(result.data.url);
    });
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-2 font-display text-lg font-bold text-ink">Plano</legend>
        {plans.map((p) => (
          <label
            key={p.id}
            className={cn(
              "block cursor-pointer rounded-[var(--radius-card)] border bg-white p-4",
              p.id === plan ? "border-brand ring-2 ring-brand" : "border-line",
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="plan"
                value={p.id}
                checked={p.id === plan}
                onChange={() => setPlan(p.id)}
                className="size-5 accent-[var(--color-brand)]"
              />
              <span className="flex-1 font-display text-xl font-bold text-ink">{p.name}</span>
              <span className="font-semibold text-ink">{formatPrice(p.amountCents)}/mês</span>
            </span>
            <ul className="mt-2 space-y-1 pl-8 text-sm text-ink-2">
              {p.highlights.map((h) => (
                <li key={h}>✓ {h}</li>
              ))}
            </ul>
          </label>
        ))}
      </fieldset>

      {available.length > 0 ? (
        <section aria-labelledby="extras-titulo" className="space-y-3">
          <h2 id="extras-titulo" className="font-display text-lg font-bold text-ink">
            Extras (opcional)
          </h2>
          <ul className="space-y-3">
            {available.map((a) => {
              const n = qty[a.addonId] ?? 0;
              return (
                <li
                  key={a.addonId}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{a.name}</p>
                    <p className="text-sm text-ink-2">
                      {formatPrice(a.amountCents)}/mês cada
                      {a.description ? ` · ${a.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Menos ${a.name}`}
                      onClick={() => setQuantity(a.addonId, n - 1)}
                      disabled={n === 0}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center font-semibold" aria-live="polite">
                      <span className="sr-only">Quantidade de {a.name}: </span>
                      {n}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`Mais ${a.name}`}
                      onClick={() => setQuantity(a.addonId, n + 1)}
                    >
                      +
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <p className="flex-1 text-sm text-ink-2">
            Total por mês
            <strong className="block font-display text-2xl text-ink" data-testid="checkout-total">
              {formatPrice(total)}
            </strong>
          </p>
          <Button size="lg" onClick={submit} loading={pending}>
            Ir para o pagamento
          </Button>
        </div>
      </div>
    </div>
  );
}
