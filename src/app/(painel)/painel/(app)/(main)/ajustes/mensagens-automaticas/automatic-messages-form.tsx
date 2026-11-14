"use client";

import Link from "next/link";
import { useState } from "react";
import { saveMessageSettingsAction } from "@/app/(painel)/painel/(app)/_actions/message-settings";
import { useAction } from "@/components/painel/use-action";
import { Alert, Badge, Button, Card } from "@/components/ui";
import {
  appointmentsPerQuota,
  messagesPerAppointment,
  REMINDER_OFFSET_OPTIONS,
  type MessageSettings,
} from "@/lib/whatsapp/message-settings";

type Kind = "confirmation" | "reminder" | "cancellation";

const ROWS: { key: keyof MessageSettings; kind: Kind; title: string; desc: string }[] = [
  {
    key: "confirmation_enabled",
    kind: "confirmation",
    title: "Confirmação ao agendar",
    desc: "Sai assim que o cliente agenda (ou quando você cria o agendamento).",
  },
  {
    key: "reminder_enabled",
    kind: "reminder",
    title: "Lembrete antes do horário",
    desc: "Diminui as faltas.",
  },
  {
    key: "cancellation_enabled",
    kind: "cancellation",
    title: "Aviso de cancelamento",
    desc: "Quando o horário é cancelado.",
  },
];

export function AutomaticMessagesForm({
  allowed,
  initial,
  limit,
  used,
  previews,
}: {
  allowed: boolean;
  initial: MessageSettings;
  limit: number;
  used: number;
  previews: Record<Kind, string>;
}) {
  const [s, setS] = useState<MessageSettings>(initial);
  const { run, pending, error, message } = useAction();
  const per = messagesPerAppointment(s);
  const capacity = appointmentsPerQuota(limit, s);

  const toggleOffset = (min: number, on: boolean) =>
    setS((x) => ({
      ...x,
      reminder_offsets_min: on
        ? [...new Set([...x.reminder_offsets_min, min])]
        : x.reminder_offsets_min.filter((m) => m !== min),
    }));

  return (
    <div className="space-y-4">
      {!allowed ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge tone="brand">Disponível no Pro</Badge>
            <p className="mt-2 text-sm text-ink-2">
              No seu plano, a confirmação vai pelo seu WhatsApp com a mensagem pronta. No Pro, a
              Calenvia envia sozinha.
            </p>
          </div>
          <Link href="/assinatura" className="font-semibold text-brand underline">
            Ver planos
          </Link>
        </Card>
      ) : (
        <Card className="space-y-1 p-4">
          <p className="font-semibold" data-testid="quota-usage">
            {used} de {limit} mensagens usadas neste mês
          </p>
          <p className="text-sm text-ink-2" data-testid="quota-estimate">
            {capacity === null
              ? "Com essa configuração, nenhuma mensagem automática é enviada."
              : `Com essa configuração (${per} ${per === 1 ? "mensagem" : "mensagens"} por agendamento), sua cota de ${limit} mensagens atende cerca de ${capacity} agendamentos por mês.`}
          </p>
        </Card>
      )}

      <fieldset disabled={!allowed} className="space-y-3 disabled:opacity-60">
        <legend className="sr-only">Mensagens automáticas</legend>
        {ROWS.map((row) => {
          const on = Boolean(s[row.key]);
          const id = `msg-${row.kind}`;
          return (
            <Card key={row.key} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <label htmlFor={id} className="min-w-0 cursor-pointer">
                  <span className="block font-semibold">{row.title}</span>
                  <span className="block text-sm text-ink-2">{row.desc}</span>
                </label>
                <input
                  id={id}
                  type="checkbox"
                  role="switch"
                  aria-checked={on}
                  className="mt-1 size-6 shrink-0 accent-brand"
                  checked={on}
                  onChange={(e) => setS((x) => ({ ...x, [row.key]: e.target.checked }))}
                />
              </div>
              {row.kind === "reminder" && on ? (
                <div
                  role="group"
                  aria-label="Quando o lembrete sai"
                  className="flex flex-wrap gap-2"
                >
                  {REMINDER_OFFSET_OPTIONS.map((o) => {
                    const checked = s.reminder_offsets_min.includes(o.min);
                    return (
                      <label
                        key={o.min}
                        className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 font-semibold ${checked ? "border-brand bg-brand-50 text-brand" : "border-line"}`}
                      >
                        <input
                          type="checkbox"
                          className="size-5 accent-brand"
                          checked={checked}
                          onChange={(e) => toggleOffset(o.min, e.target.checked)}
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              ) : null}
              <details>
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">
                  Ver o texto da mensagem
                </summary>
                <div className="rounded-2xl rounded-tl-sm bg-[#dcf8c6] p-3 text-[15px] whitespace-pre-wrap text-ink">
                  {previews[row.kind]}
                </div>
              </details>
            </Card>
          );
        })}
      </fieldset>

      {allowed ? (
        <>
          {s.reminder_enabled && s.reminder_offsets_min.length === 0 ? (
            <Alert tone="warning">Escolha quando o lembrete sai, ou desligue o lembrete.</Alert>
          ) : null}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {message ? <Alert tone="success">{message}</Alert> : null}
          <Button
            size="lg"
            block
            loading={pending}
            disabled={s.reminder_enabled && s.reminder_offsets_min.length === 0}
            onClick={() => run(() => saveMessageSettingsAction(s))}
          >
            Salvar
          </Button>
          <p className="text-sm text-ink-2">
            Vale para os próximos envios, inclusive lembretes de agendamentos que já existem. Se a
            confirmação estiver desligada, o botão “Enviar confirmação no WhatsApp” continua no
            agendamento.
          </p>
        </>
      ) : null}
    </div>
  );
}
