import type { PlanStatus } from "@/lib/plans";

/** Dias que a assinatura com fatura em atraso continua funcionando antes de suspender. */
export const PAST_DUE_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type StatusEvent =
  | { type: "paid" }
  | { type: "payment_failed" }
  | { type: "canceled" }
  /** Cron diário: suspende quem passou da carência. */
  | { type: "grace_check"; pastDueSince: Date | string | null };

/** Fim da carência de quem está com pagamento atrasado desde `since`. */
export function graceEndsAt(since: Date | string): Date {
  return new Date(new Date(since).getTime() + PAST_DUE_GRACE_DAYS * DAY_MS);
}

/**
 * Próximo status do negócio (`businesses.plan_status`) depois de um evento de cobrança.
 * Função pura: o servidor aplica o resultado no banco.
 */
export function nextPlanStatus(current: PlanStatus, event: StatusEvent, now: Date): PlanStatus {
  switch (event.type) {
    case "paid":
      // Pagou: volta a funcionar, venha de onde vier.
      return "active";
    case "payment_failed":
      // Só quem estava em dia entra em atraso; pendente, suspenso e cancelado ficam como estão.
      return current === "active" ? "past_due" : current;
    case "canceled":
      return "canceled";
    case "grace_check":
      if (current !== "past_due") return current;
      if (!event.pastDueSince) return current;
      return now.getTime() >= graceEndsAt(event.pastDueSince).getTime() ? "suspended" : current;
  }
}
