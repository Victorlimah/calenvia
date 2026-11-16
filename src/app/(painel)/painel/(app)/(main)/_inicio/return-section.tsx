import Link from "next/link";
import { StatCard, formatPercent } from "@/components/painel/charts";
import {
  comeBackMessage,
  missingCustomers,
  overallAverageGap,
  returnRate,
  type CustomerVisits,
} from "@/lib/metrics-owner/customers";
import { waMeLink } from "@/lib/phone";

/** Retorno dos clientes no Início (CAL-124). */
export function ReturnSection({
  customers,
  today,
  businessName,
}: {
  customers: CustomerVisits[];
  today: string;
  businessName: string;
  finance: boolean;
}) {
  const avg = overallAverageGap(customers);
  const rates = [30, 60, 90].map((n) => ({ n, ...returnRate(customers, n, today) }));
  const missing = missingCustomers(customers, today);
  return (
    <section aria-labelledby="retorno" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="retorno" className="font-display text-xl font-bold text-ink">
          Retorno dos clientes
        </h2>
        <Link
          href="/clientes?filtro=sumidos"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
        >
          Ver sumidos
        </Link>
      </div>
      {customers.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-white px-5 py-4 text-ink-2">
          Quando seus clientes voltarem, você vê aqui de quanto em quanto tempo eles vêm.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard
              label="Tempo médio entre visitas"
              value={avg === null ? "—" : `${Math.round(avg)} dias`}
              hint="De uma visita até a próxima"
            />
            {rates.map((r) => (
              <StatCard
                key={r.n}
                label={`Voltaram em ${r.n} dias`}
                value={formatPercent(r.rate)}
                hint={
                  r.eligible
                    ? `${r.returned} de ${r.eligible} clientes`
                    : "Ainda sem clientes antigos o bastante"
                }
              />
            ))}
          </div>
          <div className="rounded-[var(--radius-card)] border border-line bg-white">
            <p className="border-b border-line px-5 py-3 text-sm text-ink-2">
              <strong className="text-ink">
                {missing.length} cliente{missing.length === 1 ? "" : "s"} sumido
                {missing.length === 1 ? "" : "s"}
              </strong>{" "}
              — já passaram do tempo que costumam levar para voltar.
            </p>
            {missing.length ? (
              <ul className="divide-y divide-line">
                {missing.slice(0, 5).map((m) => (
                  <MissingRow key={m.id} m={m} businessName={businessName} />
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export function MissingRow({
  m,
  businessName,
}: {
  m: ReturnType<typeof missingCustomers>[number];
  businessName: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3">
      <Link href={`/clientes/${m.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{m.name}</span>
        <span className="block text-sm text-muted">
          Última visita há {m.daysSince} dias · costuma voltar a cada {m.averageGap} dias
        </span>
      </Link>
      {m.optedOut ? (
        <span className="text-sm text-muted">Não quer receber mensagens</span>
      ) : (
        <a
          href={waMeLink(m.whatsapp, comeBackMessage(m.name, businessName))}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-line px-3 text-sm font-semibold text-ink hover:border-brand"
        >
          Chamar no WhatsApp
        </a>
      )}
    </li>
  );
}
