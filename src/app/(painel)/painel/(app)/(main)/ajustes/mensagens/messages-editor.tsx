"use client";

import { useMemo, useState } from "react";
import { saveMessageTextsAction } from "@/app/(painel)/painel/(app)/_actions/business";
import { useAction } from "@/components/painel/use-action";
import { Alert, Button, Card } from "@/components/ui";
import {
  DEFAULT_TEMPLATES,
  fillCustom,
  MAX_CUSTOM_TEXT,
  validateCustomText,
  VARIABLES,
  type CustomKind,
} from "@/lib/messages/custom";

const TITLES: Record<CustomKind, string> = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
};

export function MessagesEditor({
  businessName,
  timezone,
  initial,
}: {
  businessName: string;
  timezone: string;
  initial: Record<CustomKind, string | null>;
}) {
  const [texts, setTexts] = useState<Record<CustomKind, string>>({
    confirmation: initial.confirmation ?? DEFAULT_TEMPLATES.confirmation,
    reminder: initial.reminder ?? DEFAULT_TEMPLATES.reminder,
  });
  const { run, pending, error, message, fieldErrors } = useAction();
  const sample = useMemo(
    () => ({
      customerName: "Lucas Andrade",
      businessName,
      serviceName: "Corte",
      staffName: "Carla",
      start: new Date(Date.now() + 86400000),
      timezone,
      link: "https://seunegocio.calenvia.com.br/gerenciar/ABC234",
    }),
    [businessName, timezone],
  );

  function save() {
    const payload = Object.fromEntries(
      (Object.keys(texts) as CustomKind[]).map((k) => [
        k,
        texts[k].trim() === DEFAULT_TEMPLATES[k] ? null : texts[k],
      ]),
    );
    run(() => saveMessageTextsAction(payload));
  }

  return (
    <div className="space-y-4">
      {(Object.keys(TITLES) as CustomKind[]).map((kind) => {
        const local = validateCustomText(texts[kind]);
        const id = `msg-${kind}`;
        return (
          <Card key={kind} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={id} className="font-display text-lg font-bold">
                {TITLES[kind]}
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTexts((t) => ({ ...t, [kind]: DEFAULT_TEMPLATES[kind] }))}
              >
                Restaurar padrão
              </Button>
            </div>
            <textarea
              id={id}
              rows={6}
              maxLength={MAX_CUSTOM_TEXT}
              value={texts[kind]}
              onChange={(e) => setTexts((t) => ({ ...t, [kind]: e.target.value }))}
              aria-invalid={Boolean(local || fieldErrors[kind])}
              aria-describedby={`${id}-help`}
              className="block w-full rounded-[var(--radius-control)] border border-line bg-white px-3 py-2 text-base"
            />
            <p id={`${id}-help`} className="text-sm text-ink-2">
              {local ?? fieldErrors[kind] ?? `${texts[kind].length}/${MAX_CUSTOM_TEXT} caracteres`}
            </p>
            <div>
              <p className="mb-1 text-sm font-semibold text-ink-2">Prévia</p>
              <div className="rounded-2xl rounded-tl-sm bg-[#dcf8c6] p-3 text-[15px] whitespace-pre-wrap text-ink">
                {fillCustom(texts[kind], sample)}
              </div>
            </div>
          </Card>
        );
      })}
      <Card className="space-y-2">
        <p className="font-semibold">Variáveis que você pode usar</p>
        <ul className="grid gap-1 text-sm text-ink-2 sm:grid-cols-2">
          {VARIABLES.map((v) => (
            <li key={v.key}>
              <code className="rounded bg-paper-2 px-1 font-semibold text-ink">{`{${v.key}}`}</code>{" "}
              {v.label}
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-2">Use *asteriscos* para deixar em negrito no WhatsApp.</p>
      </Card>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <Button size="lg" block loading={pending} onClick={save}>
        Salvar mensagens
      </Button>
    </div>
  );
}
