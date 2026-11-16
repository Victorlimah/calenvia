"use client";

import { useAction } from "@/components/painel/use-action";
import { Button } from "@/components/ui";
import { activateCourtesyAction } from "./billing-actions";

/** "Ativar" um negócio que aguarda liberação: libera sem cobrança (cortesia). */
export function ActivateButton({ businessId, name }: { businessId: string; name: string }) {
  const { run, pending, error, message } = useAction();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        loading={pending}
        onClick={() => {
          if (
            confirm(
              `Ativar ${name} sem cobrança (cortesia)?\n\nO painel e a página de agendamento passam a funcionar na hora, sem pagamento. Dá para cobrar depois trocando para uma assinatura paga.`,
            )
          )
            run(() => activateCourtesyAction(businessId));
        }}
      >
        Ativar
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {message ? <span className="text-xs text-success">{message}</span> : null}
    </span>
  );
}
