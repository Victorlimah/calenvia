"use client";

import { useAction } from "@/components/painel/use-action";
import { Alert, Button } from "@/components/ui";
import { type BillingSimulation, simulateBillingAction } from "../../billing-actions";

const BUTTONS: { kind: BillingSimulation; label: string }[] = [
  { kind: "renewal", label: "Simular renovação" },
  { kind: "failure", label: "Simular falha de pagamento" },
  { kind: "payment", label: "Simular pagamento da fatura" },
];

/** Só aparece com o pagamento simulado (BILLING_PROVIDER=mock). */
export function BillingSimulations({ businessId }: { businessId: string }) {
  const { run, pending, error, message } = useAction();
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => (
          <Button
            key={b.kind}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => simulateBillingAction(businessId, b.kind))}
          >
            {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
