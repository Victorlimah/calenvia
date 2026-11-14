"use client";

import { useState } from "react";
import { sendSupportRequestAction } from "@/app/(painel)/painel/(app)/_actions/support";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, Field, Select, Textarea } from "@/components/ui";

export function SupportForm() {
  const [topic, setTopic] = useState("agenda");
  const [message, setMessage] = useState("");
  const { run, pending, error, message: ok, fieldErrors } = useAction();
  return (
    <Card className="space-y-3">
      <Field label="Assunto">
        {({ id }) => (
          <Select id={id} value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="agenda">Agenda e horários</option>
            <option value="whatsapp">Mensagens do WhatsApp</option>
            <option value="pagina">Minha página</option>
            <option value="assinatura">Assinatura e pagamento</option>
            <option value="outro">Outro assunto</option>
          </Select>
        )}
      </Field>
      <Field label="Como podemos ajudar?" error={fieldErrors.message}>
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}
      </Field>
      <Button
        block
        loading={pending}
        onClick={() =>
          run(() => sendSupportRequestAction({ topic, message }), {
            onSuccess: () => setMessage(""),
          })
        }
      >
        Enviar
      </Button>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {ok ? <Alert tone="success">{ok}</Alert> : null}
    </Card>
  );
}
