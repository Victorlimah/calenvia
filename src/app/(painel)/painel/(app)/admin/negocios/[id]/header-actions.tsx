"use client";

import { useAction } from "@/components/painel/use-action";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { setBusinessSuspendedAction } from "../../actions";
import { activateCourtesyAction } from "../../billing-actions";

/** Ações principais no cabeçalho da tela do negócio (CAL-131). Perigosas pedem confirmação. */
export function BusinessHeaderActions({
  businessId,
  name,
  status,
  canCourtesy,
  enterHref,
}: {
  businessId: string;
  name: string;
  status: string;
  canCourtesy: boolean;
  enterHref: string;
}) {
  const action = useAction();
  const suspended = status === "suspended";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canCourtesy ? (
          <Button
            size="sm"
            variant="secondary"
            loading={action.pending}
            onClick={() => {
              if (
                confirm(
                  `Ativar ${name} sem cobrança (cortesia)?\n\nO painel e a página passam a funcionar na hora, sem pagamento.`,
                )
              )
                action.run(() => activateCourtesyAction(businessId));
            }}
          >
            Ativar cortesia
          </Button>
        ) : null}
        <ButtonLink href={enterHref} size="sm" variant="outline">
          Entrar como o negócio
        </ButtonLink>
        <Button
          size="sm"
          variant="outline"
          className={suspended ? undefined : "text-danger"}
          loading={action.pending}
          onClick={() => {
            const text = suspended
              ? `Reativar ${name}?\n\nO painel volta a aceitar alterações e a página de agendamento abre de novo.`
              : `Suspender ${name}?\n\nO painel fica só para consulta e a página de agendamento sai do ar até você reativar ou o pagamento ser regularizado. Os clientes não conseguem agendar.`;
            if (confirm(text)) action.run(() => setBusinessSuspendedAction(businessId, !suspended));
          }}
        >
          {suspended ? "Reativar" : "Suspender"}
        </Button>
      </div>
      {action.error ? <Alert tone="danger">{action.error}</Alert> : null}
      {action.message ? <Alert tone="success">{action.message}</Alert> : null}
    </div>
  );
}
