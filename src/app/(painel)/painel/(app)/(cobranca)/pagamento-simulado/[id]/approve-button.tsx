"use client";

import { useState, useTransition } from "react";
import { approveMockPaymentAction } from "@/app/(painel)/painel/(app)/_actions/billing";
import { Alert, Button } from "@/components/ui";

export function ApproveButton({ sessionId }: { sessionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        size="lg"
        block
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await approveMockPaymentAction(sessionId);
            if (!result.ok) setError(result.error);
            else if (result.data) window.location.assign(result.data.redirectTo);
          })
        }
      >
        Aprovar pagamento
      </Button>
    </div>
  );
}
