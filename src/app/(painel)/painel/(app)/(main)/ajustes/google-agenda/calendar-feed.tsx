"use client";

import { useState } from "react";
import {
  disableCalendarAction,
  rotateCalendarTokenAction,
} from "@/app/(painel)/painel/(app)/_actions/calendar";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card, Field, Select } from "@/components/ui";

export function CalendarFeed({
  url,
  staff,
}: {
  url: string | null;
  staff: { id: string; name: string }[];
}) {
  const [who, setWho] = useState("");
  const [copied, setCopied] = useState(false);
  const { run, pending, error, message } = useAction();
  const full = url ? (who ? `${url}?profissional=${who}` : url) : null;

  return (
    <div className="space-y-4">
      {!full ? (
        <Card className="space-y-3">
          <p className="text-ink-2">
            Gere um link privado da sua agenda. Os agendamentos aparecem sozinhos no seu calendário
            (atualiza a cada poucos minutos; mudanças são feitas aqui na Calenvia).
          </p>
          <Button loading={pending} onClick={() => run(() => rotateCalendarTokenAction())}>
            Gerar link da agenda
          </Button>
        </Card>
      ) : (
        <Card className="space-y-3">
          {staff.length > 1 ? (
            <Field label="Agenda de">
              {({ id }) => (
                <Select id={id} value={who} onChange={(e) => setWho(e.target.value)}>
                  <option value="">Todos os profissionais</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : null}
          <p className="text-sm font-semibold">Seu link privado</p>
          <p
            className="rounded-xl bg-paper-2 p-3 font-mono text-sm break-all"
            data-testid="feed-url"
          >
            {full}
          </p>
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(full);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
          >
            {copied ? "Copiado!" : "Copiar link"}
          </Button>
          <Alert tone="warning">
            Quem tiver este link vê seus horários e o nome dos clientes. Não publique. Se vazar,
            gere um novo.
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              loading={pending}
              onClick={() => run(() => rotateCalendarTokenAction())}
            >
              Gerar novo link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => run(() => disableCalendarAction())}>
              Desativar
            </Button>
          </div>
        </Card>
      )}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card className="space-y-3 text-sm text-ink-2">
        <h2 className="font-display text-lg font-bold text-ink">Como adicionar</h2>
        <div>
          <p className="font-semibold text-ink">Google Agenda (no computador)</p>
          <p>
            Abra calendar.google.com › ao lado de “Outras agendas”, toque em + › “Do URL” › cole o
            link › Adicionar agenda. Depois ela aparece também no app do celular.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">iPhone</p>
          <p>
            Ajustes › Calendário › Contas › Adicionar Conta › Outra › Adicionar Calendário Assinado
            › cole o link.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Outlook</p>
          <p>Adicionar calendário › Assinar da Web › cole o link.</p>
        </div>
      </Card>
    </div>
  );
}
