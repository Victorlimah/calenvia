import type { Metadata } from "next";
import Link from "next/link";
import { Timeline } from "@/components/painel/agenda/timeline";
import { buttonClasses } from "@/components/ui";
import { loadAgendaDay } from "@/lib/agenda/load";
import { buildTimeline, daySummary } from "@/lib/agenda/timeline";
import { requireReadyBusiness } from "@/lib/business/current";
import {
  addLocalDays,
  formatDayLabel,
  isLocalDate,
  localDateToInstant,
  todayIn,
} from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agenda — Calenvia" };

type Props = { searchParams: Promise<{ data?: string; profissional?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const business = await requireReadyBusiness();
  const sp = await searchParams;
  const tz = business.timezone;
  const today = todayIn(tz);
  const date = sp.data && isLocalDate(sp.data) ? sp.data : today;
  const supabase = await createSupabaseServerClient();
  const { ctx, appointments, blocks } = await loadAgendaDay(supabase, business, date);
  const staffId =
    sp.profissional && ctx.staff.some((s) => s.id === sp.profissional) ? sp.profissional : null;
  const staffNames = Object.fromEntries(ctx.staff.map((s) => [s.id, s.name]));
  const { items, canceled, dayStatus } = buildTimeline({
    ctx,
    date,
    staffId,
    appointments,
    blocks,
  });
  const summary = daySummary(appointments.filter((a) => !staffId || a.staffId === staffId));
  const label = formatDayLabel(localDateToInstant(date, tz), tz);
  const q = (d: string) => `/?data=${d}${staffId ? `&profissional=${staffId}` : ""}`;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 pt-6 pb-10 md:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Agenda</h1>
          <p className="mt-0.5 text-ink-2 first-letter:uppercase">
            {date === today ? `Hoje, ${label}` : label}
          </p>
        </div>
        <Link href={`/novo?data=${date}`} className={buttonClasses({ size: "md" })}>
          + Novo
        </Link>
      </header>

      <nav aria-label="Navegar entre dias" className="flex items-center gap-2">
        <Link
          href={q(addLocalDays(date, -1))}
          aria-label="Dia anterior"
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ‹
        </Link>
        {date !== today ? (
          <Link href={q(today)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Hoje
          </Link>
        ) : null}
        <Link
          href={q(addLocalDays(date, 1))}
          aria-label="Próximo dia"
          className={buttonClasses({ variant: "outline", size: "sm", className: "w-11 px-0" })}
        >
          ›
        </Link>
      </nav>

      <section aria-label="Resumo do dia" className="grid grid-cols-3 gap-2">
        <Stat label="Agendamentos" value={String(summary.total)} />
        <Stat label="Livres" value={String(items.filter((i) => i.kind === "free").length)} />
        <Stat label="Previsto" value={formatPrice(summary.expectedRevenueCents)} />
      </section>

      <Timeline
        items={items}
        canceled={canceled}
        timezone={tz}
        date={date}
        dayStatus={dayStatus}
        staffNames={staffNames}
        showStaff={!staffId && ctx.staff.length > 1}
      />
    </main>
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
