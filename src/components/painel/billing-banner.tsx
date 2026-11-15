import Link from "next/link";
import { graceEndsAt } from "@/lib/billing/status";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Faixa no topo do painel quando a assinatura tem problema (CAL-077): pagamento atrasado
 * (ainda funciona até o fim da carência) ou suspensa (painel só leitura, página fechada).
 */
export function BillingBanner({
  status,
  pastDueSince,
  timezone,
  canManage,
}: {
  status: string;
  pastDueSince: string | null;
  timezone: string;
  canManage: boolean;
}) {
  if (status !== "past_due" && status !== "suspended") return null;
  const suspended = status === "suspended";
  const until = pastDueSince
    ? formatInTimeZone(graceEndsAt(pastDueSince), timezone, "dd/MM")
    : null;
  return (
    <div
      role={suspended ? "alert" : "status"}
      data-testid="billing-banner"
      className={
        suspended
          ? "rounded-[var(--radius-control)] border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger"
          : "rounded-[var(--radius-control)] border border-warning/30 bg-warning-50 px-4 py-3 text-sm text-warning"
      }
    >
      <p className="font-semibold">
        {suspended ? "Assinatura suspensa" : "Não conseguimos cobrar sua assinatura"}
      </p>
      <p className="mt-0.5">
        {suspended
          ? "Sua página não está recebendo agendamentos e o painel está só para consulta."
          : `Tudo continua funcionando${until ? ` até ${until}` : ""}. Depois disso, a assinatura é suspensa.`}{" "}
        {canManage ? (
          <Link href="/assinatura" className="font-semibold underline underline-offset-2">
            {suspended ? "Regularizar pagamento" : "Ver assinatura"}
          </Link>
        ) : (
          "Avise o dono do negócio."
        )}
      </p>
    </div>
  );
}
