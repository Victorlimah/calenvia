"use client";

import { setCustomerMessagesAction } from "@/app/(painel)/painel/(app)/_actions/customers";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card } from "@/components/ui";

/** Situação das mensagens automáticas do cliente, com opção de pausar/religar. */
export function CustomerMessages({
  customerId,
  optedOut,
}: {
  customerId: string;
  optedOut: boolean;
}) {
  const { run, pending, error, message } = useAction();
  const toggle = () => run(() => setCustomerMessagesAction({ customerId, enabled: optedOut }));

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Mensagens automáticas</h2>
        <p className="mt-0.5 text-sm text-ink-2">
          {optedOut
            ? "Este cliente pediu para não receber confirmações e lembretes. Você ainda pode falar com ele pelo seu WhatsApp."
            : "Este cliente recebe a confirmação e o lembrete no WhatsApp. Se ele responder SAIR, as mensagens param sozinhas."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={toggle}
        disabled={pending}
        aria-pressed={optedOut}
      >
        {optedOut ? "Voltar a enviar mensagens" : "Parar de enviar para este cliente"}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </Card>
  );
}
