"use client";

import {
  markWaitlistNotifiedAction,
  removeWaitlistEntryAction,
} from "@/app/(painel)/painel/(app)/_actions/waitlist";
import { useAction } from "@/components/painel/use-action";
import { Badge, Card } from "@/components/ui";
import { formatPhone } from "@/lib/phone";

export type WaitlistItem = {
  id: string;
  name: string;
  whatsapp: string;
  service: string;
  period: string;
  status: string;
  waLink: string;
};

/** Lista de espera do dia na agenda (CAL-104). */
export function WaitlistSection({ items }: { items: WaitlistItem[] }) {
  const { run, pending } = useAction();
  if (!items.length) return null;
  return (
    <section aria-labelledby="espera" className="space-y-2">
      <h2 id="espera" className="font-display text-lg font-bold">
        Lista de espera ({items.length})
      </h2>
      <p className="text-sm text-ink-2">
        Se abrir um horário (cancelamento ou bloqueio removido), avise quem está esperando.
      </p>
      <Card className="divide-y divide-line p-0">
        {items.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {w.name} {w.status === "notified" ? <Badge tone="success">Avisado</Badge> : null}
              </p>
              <p className="text-sm text-ink-2">
                {w.service} · {w.period} · {formatPhone(w.whatsapp)}
              </p>
            </div>
            <a
              href={w.waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => run(() => markWaitlistNotifiedAction(w.id))}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-semibold text-white"
            >
              Avisar no WhatsApp
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeWaitlistEntryAction(w.id))}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-paper-2"
              aria-label={`Remover ${w.name} da lista de espera`}
            >
              Remover
            </button>
          </div>
        ))}
      </Card>
    </section>
  );
}
