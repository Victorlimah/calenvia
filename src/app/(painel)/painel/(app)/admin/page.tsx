import Link from "next/link";
import { Button, EmptyState, Input, Select } from "@/components/ui";
import { PLAN_STATUS_LABELS, PLAN_STATUSES } from "@/lib/admin/business-update";
import {
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_SORTS,
  directoryHref,
  parseDirectoryFilters,
} from "@/lib/admin/directory";
import { formatAdminDate } from "@/lib/admin/format";
import { SEGMENTS } from "@/lib/business/segments";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ActivateButton } from "./activate-button";
import { BusinessDirectory, type DirectoryRow } from "./business-directory";
import { AdminBody, AdminTitle } from "./ui";

type Search = Record<string, string | undefined>;

/** Home do admin (CAL-130): o que fazer agora + lista completa de negócios. */
export default async function AdminHomePage({ searchParams }: { searchParams: Promise<Search> }) {
  const f = parseDirectoryFilters(await searchParams);
  const db = createSupabaseAdminClient();
  const [list, pendingList, counts] = await Promise.all([
    db.rpc("admin_business_directory", {
      p_search: f.q || undefined,
      p_plan: f.plan ?? undefined,
      p_status: f.status ?? undefined,
      p_segment: f.segment ?? undefined,
      p_city: f.city || undefined,
      p_sort: f.sort,
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: (f.page - 1) * DIRECTORY_PAGE_SIZE,
    }),
    db.rpc("admin_business_directory", { p_status: "pending", p_limit: 5 }),
    db.rpc("admin_pending_counts"),
  ]);
  const rows = (list.data ?? []) as unknown as (DirectoryRow & { total_count: number })[];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE));
  const c = counts.data?.[0];
  const pending = (pendingList.data ?? []) as unknown as DirectoryRow[];
  const n = (v: unknown) => Number(v ?? 0);
  const todo = [
    {
      label: "Pagamentos atrasados",
      count: n(c?.past_due),
      href: "/admin?status=past_due",
      hint: "Ficam suspensos em 7 dias se não pagarem",
    },
    {
      label: "Contas suspensas",
      count: n(c?.suspended),
      href: "/admin?status=suspended",
      hint: "Painel só leitura e página fechada",
    },
    {
      label: "Suporte aberto",
      count: n(c?.support_open),
      href: "/admin/suporte",
      hint: "Pedidos esperando resposta",
    },
    {
      label: "Mensagens com falha",
      count: n(c?.failed_messages_7d),
      href: "/admin/mensagens",
      hint: "WhatsApp que não chegou (7 dias)",
    },
  ];
  const filtered = Boolean(f.q || f.plan || f.status || f.segment || f.city);

  return (
    <AdminBody>
      <AdminTitle
        title="Negócios"
        description="O que precisa de atenção e todos os clientes da Calenvia."
      />

      <section aria-labelledby="agora" className="space-y-3">
        <h2 id="agora" className="font-display text-xl font-bold text-ink">
          O que fazer agora
        </h2>
        <div className="rounded-[var(--radius-card)] border border-line bg-white">
          <p className="border-b border-line px-5 py-3 font-semibold">
            Aguardando liberação <span className="text-muted">({n(c?.pending_activation)})</span>
          </p>
          {pending.length === 0 ? (
            <p className="px-5 py-3 text-sm text-muted">Nenhum cadastro esperando ativação.</p>
          ) : (
            <ul aria-label="Aguardando liberação" className="divide-y divide-line">
              {pending.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <Link href={`/admin/negocios/${b.id}`} className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{b.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {b.owner_email ?? "sem e-mail"} · desde {formatAdminDate(b.created_at)}
                    </span>
                  </Link>
                  <ActivateButton businessId={b.id} name={b.name} />
                </li>
              ))}
            </ul>
          )}
          {n(c?.pending_activation) > pending.length ? (
            <Link
              href="/admin?status=pending"
              className="block border-t border-line px-5 py-3 text-sm font-semibold text-brand"
            >
              Ver todos
            </Link>
          ) : null}
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {todo.map((t) => (
            <li key={t.label}>
              <Link
                href={t.href}
                className="block h-full rounded-2xl border border-line bg-white px-4 py-3 hover:border-brand"
              >
                <span className="block text-xs font-medium text-muted">{t.label}</span>
                <span
                  className={`block font-display text-2xl font-bold ${t.count ? "text-danger" : "text-ink"}`}
                >
                  {t.count}
                </span>
                <span className="block text-xs text-muted">{t.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="todos" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="todos" className="font-display text-xl font-bold text-ink">
            Todos os negócios
          </h2>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "negócio" : "negócios"}
            {filtered ? " com estes filtros" : ""}
          </p>
        </div>
        <form
          method="get"
          action="/admin"
          role="search"
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]"
        >
          <label className="sr-only" htmlFor="q">
            Buscar
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={f.q}
            placeholder="Nome, link, e-mail do dono ou WhatsApp"
          />
          <label className="sr-only" htmlFor="plano">
            Plano
          </label>
          <Select id="plano" name="plano" defaultValue={f.plan ?? ""}>
            <option value="">Todos os planos</option>
            {PLAN_ORDER.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].name}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="status">
            Status
          </label>
          <Select id="status" name="status" defaultValue={f.status ?? ""}>
            <option value="">Todos os status</option>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PLAN_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="segmento">
            Segmento
          </label>
          <Select id="segmento" name="segmento" defaultValue={f.segment ?? ""}>
            <option value="">Todos os segmentos</option>
            {SEGMENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="cidade">
            Cidade
          </label>
          <Input id="cidade" name="cidade" defaultValue={f.city} placeholder="Cidade" />
          <label className="sr-only" htmlFor="ordem">
            Ordenar por
          </label>
          <Select id="ordem" name="ordem" defaultValue={f.sort}>
            {DIRECTORY_SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>
        {filtered ? (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
          >
            Limpar filtros
          </Link>
        ) : null}

        {list.error ? (
          <EmptyState title="Não foi possível carregar" description="Recarregue a página." />
        ) : rows.length === 0 ? (
          <EmptyState title="Nenhum negócio encontrado" description="Mude a busca ou os filtros." />
        ) : (
          <BusinessDirectory rows={rows} caption="Negócios da Calenvia" />
        )}

        {pages > 1 ? (
          <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
            {f.page > 1 ? (
              <Link
                className="min-h-11 py-3 font-semibold text-brand"
                href={directoryHref(f, { page: f.page - 1 })}
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted">
              Página {f.page} de {pages}
            </span>
            {f.page < pages ? (
              <Link
                className="min-h-11 py-3 font-semibold text-brand"
                href={directoryHref(f, { page: f.page + 1 })}
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </AdminBody>
  );
}
