"use client";

import { useAction } from "@/components/painel/use-action";
import { Alert, Button } from "@/components/ui";
import { acceptInvitationAction } from "../../../(app)/_actions/team";

export function AcceptInvitation({ token, email }: { token: string; email: string }) {
  const { run, pending, error } = useAction();
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        className="w-full"
        loading={pending}
        onClick={() =>
          run(() => acceptInvitationAction(token), {
            refresh: false,
            // Recarrega tudo: o painel passa a abrir no negócio do convite.
            onSuccess: () => window.location.assign("/"),
          })
        }
      >
        Aceitar convite
      </Button>
      {email ? (
        <p className="text-center text-sm text-muted">
          Você vai entrar com a conta <strong>{email}</strong>.
        </p>
      ) : null}
    </div>
  );
}
