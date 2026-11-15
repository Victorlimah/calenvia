import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { maskPhone } from "@/lib/admin/support";
import { openViewAs } from "@/lib/admin/view-as-server";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import {
  addLocalDays,
  formatDayLabel,
  formatTime,
  isLocalDate,
  localDateToInstant,
  todayIn,
  zonedDayRange,
} from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody } from "../../../ui";
import { ViewSection } from "./ui";

export const metadata: Metadata = { title: "Agenda do cliente — Administração Calenvia" };

type Status = keyof typeof STATUS_LABELS;

export default async function ViewAsAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ data?: string }>;
}) {
  const { id } = await params;
  const business = await openViewAs(id, "agenda");
  const tz = business.timezone;
  const sp = await searchParams;
  const today = todayIn(tz);
  const date = sp.data && isLocalDate(sp.data) ? sp.data : today;
  const { start, end } = zonedDayRange(date, tz);
  const db = createSupabaseAdminClient();
  const [appts, blocks] = await Promise.all([
    db
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, source, customer_name, customer_whatsapp, price_cents, services(name), staff_members(name)",
      )
      .eq("business_id", business.id)
      .lt("starts_at", end.toISOString())
      .gt("ends_at", start.toISOString())
      .order("starts_at"),
    db
      .from("time_blocks")
      .select("id, starts_at, ends_at, reason, staff_members(name)")
      .eq("business_id", business.id)
      .lt("starts_at", end.toISOString())
      .gt("ends_at", start.toISOString())
      .order("starts_at"),
  ]);
  const list = appts.data ?? [];
  const active = list.filter((a) => a.status !== "canceled");
  const expected = active.reduce((s, a) => s + (a.price_cents ?? 0), 0);
  const base = `/admin/negocios/${business.id}/visao`;
  const dayHref = (d: string) => (d === today ? base : `${base}?data=${d}`);

  return (
    <AdminBody>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink capitalize">
          {formatDayLabel(localDateToInstant(date, tz), tz)}
        </h1>
        <nav aria-label="Escolher dia" className="flex flex-wrap items-center gap-1">
          <Link
            href={dayHref(addLocalDays(date, -1))}
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-brand hover:bg-paper-2"
          >
            <span aria-hidden="true">‹</span>
            <span className="sr-only">Dia anterior</span>
          </Link>
          <Link
            href={base}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-paper-2"
          >
            Hoje
          </Link>
          <Link
            href={dayHref(addLocalDays(date, 1))}
            className="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-brand hover:bg-paper-2"
          >
            <span aria-hidden="true">›</span>
            <span className="sr-only">Próximo dia</span>
          </Link>
          <form method="get" className="flex items-center gap-1">
            <label htmlFor="data" className="sr-only">
              Data
            </label>
            <input
              id="data"
              name="data"
              type="date"
              defaultValue={date}
              className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-brand hover:bg-paper-2"
            >
              Ir
            </button>
          </form>
        </nav>
      </div>

      <p className="text-sm text-ink-2">
        {active.length} {active.length === 1 ? "agendamento" : "agendamentos"} · previsto{" "}
        {formatPrice(expected)} · horário de {tz}
      </p>

      <ViewSection title="Agendamentos">
        {appts.error ? (
          <p className="text-sm text-danger">Não foi possível carregar a agenda.</p>
        ) : list.length === 0 ? (
          <EmptyState title="Nenhum agendamento neste dia" description="Escolha outro dia." />
        ) : (
          <ul className="divide-y divide-line" aria-label="Agendamentos do dia">
            {list.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold text-ink">
                    {formatTime(new Date(a.starts_at), tz)}–{formatTime(new Date(a.ends_at), tz)} ·{" "}
                    {a.customer_name}
                  </p>
                  <p className="text-sm text-ink-2">
                    {a.services?.name ?? "Serviço"} com {a.staff_members?.name ?? "—"} ·{" "}
                    {maskPhone(a.customer_whatsapp)}
                    {a.source === "manual" ? " · manual" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {a.price_cents != null ? formatPrice(a.price_cents) : "—"}
                  </span>
                  <Badge tone={STATUS_TONES[a.status as Status] ?? "neutral"}>
                    {STATUS_LABELS[a.status as Status] ?? a.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ViewSection>

      {(blocks.data ?? []).length > 0 ? (
        <ViewSection title="Bloqueios">
          <ul className="divide-y divide-line text-sm">
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-ink">
                  {formatTime(new Date(b.starts_at), tz)}–{formatTime(new Date(b.ends_at), tz)} ·{" "}
                  {b.staff_members?.name ?? "Todos"}
                </span>
                <span className="text-muted">{b.reason ?? "Sem motivo"}</span>
              </li>
            ))}
          </ul>
        </ViewSection>
      ) : null}
    </AdminBody>
  );
}
