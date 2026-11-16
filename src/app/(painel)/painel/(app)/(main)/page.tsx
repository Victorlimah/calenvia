import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InicioTabs } from "@/components/painel/inicio-tabs";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Badge, buttonClasses } from "@/components/ui";
import { loadAppointments } from "@/lib/agenda/load";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import { requireReadyMember } from "@/lib/business/current";
import { formatTime, todayIn, zonedDayRange } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Início — Calenvia" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Parâmetros da agenda antiga (que morava em "/"): links salvos continuam funcionando. */
const LEGACY_AGENDA_PARAMS = ["data", "profissional", "visao"];

export default async function InicioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const legacy = new URLSearchParams();
  for (const k of LEGACY_AGENDA_PARAMS) {
    const v = sp[k];
    if (typeof v === "string" && v) legacy.set(k, v);
  }
  if (legacy.size) redirect(`/agenda?${legacy.toString()}`);

  const member = await requireReadyMember();
  const { business } = member;
  const tz = business.timezone;
  const today = todayIn(tz);
  const finance = can(member, "finance.view");
  const seeAll = can(member, "appointments.view_all");
  const manage = can(member, "appointments.manage_all");
  const supabase = await createSupabaseServerClient();
  const { start, end } = zonedDayRange(today, tz);
  const all = await loadAppointments(
    supabase,
    business.id,
    { from: start, to: end },
    { withPrices: finance },
  );
  const mine = all.filter(
    (a) => a.status !== "canceled" && (seeAll || a.staffId === member.staffMemberId),
  );
  const now = new Date();
  const next = mine.filter((a) => a.status === "confirmed" && a.end > now).slice(0, 5);
  const done = mine.filter((a) => a.status === "completed").length;
  const expected = mine
    .filter((a) => a.status !== "no_show")
    .reduce((sum, a) => sum + (a.priceCents ?? 0), 0);

  return (
    <PageBody>
      <PageHeader title="Início" description={business.name} />
      {finance ? <InicioTabs current="resumo" /> : null}

      <section aria-labelledby="hoje" className="space-y-3">
        <h2 id="hoje" className="font-display text-xl font-bold text-ink">
          Hoje
        </h2>
        <div className={`grid gap-2 ${finance ? "grid-cols-3" : "grid-cols-2"}`}>
          <Stat label="Agendamentos" value={String(mine.length)} />
          <Stat label="Concluídos" value={String(done)} />
          {finance ? <Stat label="Previsto" value={formatPrice(expected)} /> : null}
        </div>
      </section>

      <section aria-labelledby="proximos" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="proximos" className="font-display text-xl font-bold text-ink">
            Próximos de hoje
          </h2>
          <Link href="/agenda" className="text-sm font-semibold text-brand">
            Ver agenda
          </Link>
        </div>
        {next.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-line bg-white px-5 py-4 text-ink-2">
            Nenhum atendimento pela frente hoje.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {next.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/agendamento/${a.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-paper-2"
                >
                  <span className="w-12 font-semibold tabular-nums">{formatTime(a.start, tz)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.customerName}
                    <span className="text-muted"> · {a.serviceName}</span>
                  </span>
                  <Badge tone={STATUS_TONES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {manage ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/novo?data=${today}`} className={buttonClasses({ size: "md" })}>
            + Novo agendamento
          </Link>
          <Link
            href={`/registrar?data=${today}`}
            className={buttonClasses({ variant: "outline", size: "md" })}
          >
            Registrar atendimento
          </Link>
        </div>
      ) : null}
    </PageBody>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-3 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
