import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { addLocalDays, type LocalDate } from "@/lib/dates";
import { missingCustomers, ranking, type CustomerVisits } from "@/lib/metrics-owner/customers";
import { formatPrice } from "@/lib/money";
import { MissingRow } from "../_inicio/return-section";

export type ClientesFiltro = "todos" | "sumidos" | "ranking";

export function parseFiltro(v: unknown): ClientesFiltro {
  return v === "sumidos" || v === "ranking" ? v : "todos";
}

/** Abas da tela de Clientes (CAL-124/125). */
export function ClientesTabs({ current }: { current: ClientesFiltro }) {
  const tabs: { key: ClientesFiltro; label: string; href: string }[] = [
    { key: "todos", label: "Todos", href: "/clientes" },
    { key: "sumidos", label: "Sumidos", href: "/clientes?filtro=sumidos" },
    { key: "ranking", label: "Ranking", href: "/clientes?filtro=ranking" },
  ];
  return (
    <nav aria-label="Ver clientes" className="border-b border-line">
      <ul className="flex gap-1">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={current === t.key ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold",
                current === t.key
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Clientes sumidos: passaram do tempo médio deles sem voltar (CAL-124). */
export function MissingList({
  customers,
  today,
  businessName,
}: {
  customers: CustomerVisits[];
  today: LocalDate;
  businessName: string;
}) {
  const missing = missingCustomers(customers, today);
  if (!missing.length) {
    return (
      <EmptyState
        title="Ninguém sumido"
        description="Quem tem pelo menos duas visitas e passou do tempo que costuma levar para voltar aparece aqui, com um botão para chamar no WhatsApp."
      />
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">
        {missing.length} cliente{missing.length === 1 ? "" : "s"} que já passaram do tempo que
        costumam levar para voltar. A mensagem abre no seu WhatsApp, pronta para enviar.
      </p>
      <ul
        aria-label="Clientes sumidos"
        className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white"
      >
        {missing.map((m) => (
          <MissingRow key={m.id} m={m} businessName={businessName} />
        ))}
      </ul>
    </div>
  );
}

const PERIODS = [
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "ano", label: "1 ano", days: 365 },
  { key: "sempre", label: "Sempre", days: null },
] as const;

/** Ranking: mais frequentes e que mais gastam, por período (CAL-125). */
export function RankingView({
  customers,
  today,
  finance,
  por,
  periodo,
}: {
  customers: CustomerVisits[];
  today: LocalDate;
  finance: boolean;
  por: string | undefined;
  periodo: string | undefined;
}) {
  const by = finance && por === "gasto" ? "spent" : "visits";
  const period = PERIODS.find((p) => p.key === periodo) ?? PERIODS[1];
  const since = period.days === null ? null : addLocalDays(today, -(period.days - 1));
  const rows = ranking(customers, by, since, 20);
  const href = (p: { por?: string; periodo?: string }) =>
    `/clientes?${new URLSearchParams({
      filtro: "ranking",
      por: p.por ?? (by === "spent" ? "gasto" : "visitas"),
      periodo: p.periodo ?? period.key,
    })}`;
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold",
      active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:border-ink",
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ordenar ranking por">
        <Link
          href={href({ por: "visitas" })}
          aria-current={by === "visits" ? "true" : undefined}
          className={chip(by === "visits")}
        >
          Mais frequentes
        </Link>
        {finance ? (
          <Link
            href={href({ por: "gasto" })}
            aria-current={by === "spent" ? "true" : undefined}
            className={chip(by === "spent")}
          >
            Que mais gastam
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período do ranking">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={href({ periodo: p.key })}
            aria-current={p.key === period.key ? "true" : undefined}
            className={chip(p.key === period.key)}
          >
            {p.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="Sem atendimentos no período"
          description="O ranking conta só os atendimentos concluídos (o cliente avulso não entra)."
        />
      ) : (
        <ol
          aria-label={by === "spent" ? "Clientes que mais gastam" : "Clientes mais frequentes"}
          className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white"
        >
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/clientes/${r.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-paper-2"
              >
                <span className="w-7 text-center font-display font-bold text-muted tabular-nums">
                  {i + 1}º
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.name}</span>
                <span className="text-right text-sm">
                  <span className="block font-semibold text-ink tabular-nums">
                    {by === "spent" && r.spentCents !== null
                      ? formatPrice(r.spentCents)
                      : `${r.visits} visita${r.visits === 1 ? "" : "s"}`}
                  </span>
                  {finance && r.spentCents !== null ? (
                    <span className="block text-muted tabular-nums">
                      {by === "spent"
                        ? `${r.visits} visita${r.visits === 1 ? "" : "s"}`
                        : formatPrice(r.spentCents)}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
