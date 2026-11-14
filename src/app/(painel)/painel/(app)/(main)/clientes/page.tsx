import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import {
  CUSTOMER_SORTS,
  customerStatsLine,
  isFrequentNoShow,
  parseCustomerSort,
  type CustomerSummary,
} from "@/lib/customers/summary";
import { formatPhone, onlyDigits } from "@/lib/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes — Calenvia" };

const PAGE_SIZE = 50;

type Props = { searchParams: Promise<{ q?: string; ordem?: string; pagina?: string }> };

export default async function ClientesPage({ searchParams }: Props) {
  const business = await requireReadyBusiness();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const sort = parseCustomerSort(sp.ordem);
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("customer_summaries")
    .select(
      "id, name, whatsapp, visits, no_shows, upcoming, total_spent_cents, last_visit_at, opted_out_at",
      { count: "exact" },
    )
    .eq("business_id", business.id);
  const digits = onlyDigits(q);
  if (q.length >= 2) {
    query =
      digits.length >= 3
        ? query.like("whatsapp", `%${digits}%`)
        : query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  }
  const s = CUSTOMER_SORTS[sort];
  const { data, count, error } = await query
    .order(s.column, { ascending: s.ascending, nullsFirst: false })
    .order("name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const customers: CustomerSummary[] = (data ?? []).map((c) => ({
    ...c,
    visits: c.visits ?? 0,
    no_shows: c.no_shows ?? 0,
    upcoming: c.upcoming ?? 0,
    total_spent_cents: c.total_spent_cents ?? 0,
  }));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) =>
    `/clientes?${new URLSearchParams({ ...(q ? { q } : {}), ordem: sort, pagina: String(p) })}`;

  return (
    <PageBody>
      <PageHeader
        title="Clientes"
        description={total === 1 ? "1 cliente" : `${total} clientes${q ? " encontrados" : ""}`}
      />

      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" role="search">
        <label className="sr-only" htmlFor="busca">
          Buscar cliente
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Nome ou WhatsApp"
          className="min-h-12 rounded-[var(--radius-control)] border border-line bg-white px-4 text-base"
        />
        <label className="sr-only" htmlFor="ordem">
          Ordenar por
        </label>
        <select
          id="ordem"
          name="ordem"
          defaultValue={sort}
          className="min-h-12 rounded-[var(--radius-control)] border border-line bg-white px-3 text-base"
        >
          {Object.entries(CUSTOMER_SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-12 rounded-[var(--radius-control)] bg-ink px-5 font-semibold text-white"
        >
          Buscar
        </button>
      </form>

      {error ? (
        <EmptyState
          title="Não foi possível carregar os clientes"
          description="Atualize a página para tentar de novo."
        />
      ) : customers.length === 0 ? (
        <EmptyState
          title={q ? "Nenhum cliente encontrado" : "Seus clientes aparecem aqui"}
          description={
            q
              ? "Confira o nome ou o número e tente de novo."
              : "Cada pessoa que agenda pela sua página (ou que você agenda) vira um cliente, pelo WhatsApp."
          }
        />
      ) : (
        <ul className="space-y-2" aria-label="Lista de clientes">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 hover:border-ink-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{c.name}</p>
                      {c.upcoming ? <Badge tone="brand">Agendado</Badge> : null}
                      {isFrequentNoShow(c) ? <Badge tone="warning">Falta muito</Badge> : null}
                    </div>
                    <p className="text-sm text-ink-2">{formatPhone(c.whatsapp)}</p>
                    <p className="truncate text-sm text-muted">
                      {customerStatsLine(c, business.timezone)}
                    </p>
                  </div>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link href={link(page - 1)} className="min-h-11 rounded-xl px-3 py-2 font-semibold">
              ‹ Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-2">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className="min-h-11 rounded-xl px-3 py-2 font-semibold">
              Próxima ›
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageBody>
  );
}
