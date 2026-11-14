"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card } from "@/components/ui";
import { showSystemNotification } from "@/lib/notify";

type State = "unsupported" | "default" | "granted" | "denied";

/** Liga as notificações do navegador para novos agendamentos (CAL-064). */
export function NotificationSettings() {
  const [state, setState] = useState<State>("default");

  useEffect(() => {
    setState("Notification" in window ? (Notification.permission as State) : "unsupported");
  }, []);

  async function enable() {
    const result = await Notification.requestPermission();
    setState(result as State);
    if (result === "granted") {
      await showSystemNotification("Avisos ligados", {
        body: "Você vai ser avisado quando alguém agendar pela sua página.",
      });
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-bold">Avisos de novos agendamentos</h2>
        <p className="mt-0.5 text-sm text-ink-2">
          Com o painel aberto (ou instalado no celular), você recebe um aviso quando um cliente
          agenda pela sua página.
        </p>
      </div>
      {state === "granted" ? (
        <Alert tone="success">Avisos ligados neste aparelho.</Alert>
      ) : state === "denied" ? (
        <Alert tone="warning">
          As notificações estão bloqueadas neste navegador. Libere nas configurações do site
          (cadeado ao lado do endereço) para receber os avisos.
        </Alert>
      ) : state === "unsupported" ? (
        <Alert tone="info">
          Este navegador não mostra notificações. No iPhone, instale o painel na tela de início
          (Compartilhar › Adicionar à Tela de Início) para recebê-las. Os avisos na tela continuam
          funcionando.
        </Alert>
      ) : (
        <Button onClick={enable}>Ligar avisos neste aparelho</Button>
      )}
    </Card>
  );
}
