"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelSubscriptionAction,
  changePlanAction,
  customerPortalAction,
  resumeSubscriptionAction,
} from "@/app/(painel)/painel/(app)/_actions/billing";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button } from "@/components/ui";
import type { ButtonVariant } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (message) return <Alert tone="success">{message}</Alert>;
  return null;
}

export function PlanButton({
  plan,
  label,
  variant = "primary",
}: {
  plan: PlanId;
  label: string;
  variant?: ButtonVariant;
}) {
  const { run, pending, error } = useAction();
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Feedback error={error} message={null} />
      <Button
        block
        variant={variant}
        loading={pending}
        onClick={() =>
          run(() => changePlanAction(plan), {
            refresh: false,
            // O botão some depois da troca: o aviso vai para a página pela URL.
            onSuccess: (r) => router.replace(`/assinatura?troca=${r.data?.code ?? "same"}`),
          })
        }
      >
        {label}
      </Button>
    </div>
  );
}

/** "Atualizar cartão": portal do gateway; no pagamento simulado só explica. */
export function CardButton({ mock }: { mock: boolean }) {
  const { run, pending, error } = useAction();
  return (
    <div className="space-y-2">
      {error ? <Alert tone="info">{error}</Alert> : null}
      <Button
        variant="outline"
        block
        loading={pending}
        onClick={() =>
          run(() => customerPortalAction(), {
            refresh: false,
            onSuccess: (r) => r.data && window.location.assign(r.data.url),
          })
        }
      >
        Atualizar cartão
      </Button>
      {mock ? (
        <p className="text-xs text-ink-2">Pagamento simulado: não há cartão de verdade.</p>
      ) : null}
    </div>
  );
}

export function CancelControls({
  scheduled,
  endsOn,
}: {
  scheduled: boolean;
  endsOn: string | null;
}) {
  const { run, pending, error, message } = useAction();
  const [confirming, setConfirming] = useState(false);

  if (scheduled) {
    return (
      <div className="space-y-2">
        <Feedback error={error} message={message} />
        <p className="text-sm text-ink-2">
          Sua assinatura termina{endsOn ? ` em ${endsOn}` : " no fim do período"}. Até lá, tudo
          funciona normalmente.
        </p>
        <Button block loading={pending} onClick={() => run(() => resumeSubscriptionAction())}>
          Continuar com a assinatura
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Feedback error={error} message={message} />
      {confirming ? (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-danger/30 bg-danger-50 p-4">
          <p className="text-sm text-ink">
            A assinatura continua até{endsOn ? ` ${endsOn}` : " o fim do período pago"}. Depois
            disso, sua página para de receber agendamentos. Seus dados ficam guardados e você pode
            voltar quando quiser.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                run(() => cancelSubscriptionAction(), { onSuccess: () => setConfirming(false) })
              }
            >
              Sim, cancelar
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" block onClick={() => setConfirming(true)}>
          Cancelar assinatura
        </Button>
      )}
    </div>
  );
}
