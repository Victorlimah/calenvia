"use client";

import { consumePackageSessionAction } from "@/app/(painel)/painel/(app)/_actions/packages";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button } from "@/components/ui";

/** Desconta uma sessão do pacote neste agendamento (CAL-105). */
export function UsePackageButton({
  appointmentId,
  customerPackageId,
  label,
}: {
  appointmentId: string;
  customerPackageId: string;
  label: string;
}) {
  const { run, pending, error, message } = useAction();
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        block
        loading={pending}
        onClick={() => run(() => consumePackageSessionAction({ appointmentId, customerPackageId }))}
      >
        {label}
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
    </div>
  );
}
