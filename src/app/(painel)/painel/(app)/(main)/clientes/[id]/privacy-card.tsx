"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { eraseCustomerAction } from "@/app/(painel)/painel/(app)/_actions/customers";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card } from "@/components/ui";

/** LGPD (CAL-091): exportar e apagar os dados de um cliente. */
export function PrivacyCard({ customerId, erased }: { customerId: string; erased: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { run, pending, error } = useAction();

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Dados pessoais (LGPD)</h2>
        <p className="mt-0.5 text-sm text-ink-2">
          Se o cliente pedir, você pode entregar uma cópia dos dados dele ou apagá-los. Ao apagar, o
          nome e o WhatsApp somem de tudo, horários futuros são cancelados e os valores ficam só
          para o seu faturamento.
        </p>
      </div>
      <a
        href={`/clientes/${customerId}/dados`}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
        download
      >
        Baixar dados do cliente
      </a>
      {erased ? (
        <p className="text-sm font-semibold text-ink-2">
          Os dados deste cliente já foram apagados.
        </p>
      ) : confirming ? (
        <div className="space-y-2 rounded-[var(--radius-control)] border border-danger/30 bg-danger-50 p-3">
          <p className="font-semibold text-danger">
            Apagar os dados deste cliente? Não dá para desfazer.
          </p>
          <Button
            variant="danger"
            block
            loading={pending}
            onClick={() =>
              run(() => eraseCustomerAction({ customerId }), {
                onSuccess: (r) => r.data && router.push(r.data.redirectTo),
              })
            }
          >
            Sim, apagar dados
          </Button>
          <Button variant="ghost" block onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button variant="outline" block onClick={() => setConfirming(true)}>
          Apagar dados do cliente
        </Button>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </Card>
  );
}
