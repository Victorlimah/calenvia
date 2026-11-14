import Link from "next/link";
import { Alert } from "@/components/ui";
import type { QuotaState } from "@/lib/plans";
import type { QuotaNotice } from "@/lib/whatsapp/quota";

/** Aviso de cota perto do fim / esgotada (CAL-071). */
export function QuotaAlert({
  notice,
  showLink = true,
}: {
  notice: QuotaNotice | null;
  showLink?: boolean;
}) {
  if (!notice) return null;
  return (
    <Alert tone={notice.tone} title={notice.title}>
      <p>{notice.text}</p>
      {showLink ? (
        <Link
          href="/assinatura"
          className="mt-1 inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
        >
          {notice.upgradeTo ? `Ver o plano ${notice.upgradeTo.name}` : "Ver minha assinatura"}
        </Link>
      ) : null}
    </Alert>
  );
}

/** Barra de uso das mensagens do mês. */
export function QuotaMeter({ state, resetLabel }: { state: QuotaState; resetLabel: string }) {
  const pct = state.limit ? Math.min(100, Math.round((state.used / state.limit) * 100)) : 0;
  const color = state.exhausted ? "bg-warning" : state.nearLimit ? "bg-brand-dark" : "bg-brand";
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-ink">
          {state.used} de {state.limit} mensagens
        </p>
        <p className="text-sm text-ink-2">Renova em {resetLabel}</p>
      </div>
      <div
        role="progressbar"
        aria-label="Mensagens automáticas usadas no mês"
        aria-valuemin={0}
        aria-valuemax={state.limit}
        aria-valuenow={state.used}
        className="h-3 overflow-hidden rounded-full bg-paper-2"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-ink-2">
        Cada confirmação, lembrete ou aviso de cancelamento conta 1 mensagem.
      </p>
    </div>
  );
}
