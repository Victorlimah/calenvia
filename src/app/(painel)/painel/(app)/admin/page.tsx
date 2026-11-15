import Link from "next/link";
import { Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { PLAN_STATUS_LABELS, PLAN_STATUSES } from "@/lib/admin/business-update";
import { formatAdminDate, statusTone } from "@/lib/admin/format";
import {
  maxMembers,
  monthlyMessageLimit,
  PLAN_ORDER,
  PLANS,
  planOf,
  type PlanStatus,
} from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "./ui";

const PAGE_SIZE = 50;

type Search = { q?: string; plano?: string; status?: string; pagina?: string };

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const plan = PLAN_ORDER.includes(sp.plano as never) ? sp.plano! : null;
  const status = PLAN_STATUSES.includes(sp.status as never) ? sp.status! : null;
  const page = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);

  const { data, error } = await createSupabaseAdminClient().rpc("admin_business_list", {
    p_search: q || undefined,
    p_plan: plan ?? undefined,
    p_status: status ?? undefined,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (plan) p.set("plano", plan);
    if (status) p.set("status", status);
    if (n > 1) p.set("pagina", String(n));
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <AdminBody>
      <AdminTitle
        title="Negócios"
        description={`${total} ${total === 1 ? "negócio encontrado" : "negócios encontrados"}.`}
      />

      <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <label className="sr-only" htmlFor="q">
          Buscar
        </label>
        <Input id="q" name="q" defaultValue={q} placeholder="Nome, link ou e-mail do dono" />
        <label className="sr-only" htmlFor="plano">
          Plano
        </label>
        <Select id="plano" name="plano" defaultValue={plan ?? ""}>
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
        <Select id="status" name="status" defaultValue={status ?? ""}>
          <option value="">Todos os status</option>
          {PLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PLAN_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit">Filtrar</Button>
      </form>

      {error ? (
        <EmptyState title="Não foi possível carregar" description="Recarregue a página." />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum negócio encontrado" description="Mude a busca ou os filtros." />
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => {
            const max = maxMembers(b);
            const msgLimit = monthlyMessageLimit(b);
            const custom = b.member_limit_override != null || b.message_limit_override != null;
            return (
              <li key={b.id}>
                <Link href={`/admin/negocios/${b.id}`} className="block rounded-2xl">
                  <Card className="space-y-2 transition hover:border-brand">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-bold text-ink">{b.name}</p>
                        <p className="truncate text-sm text-muted">
                          {b.slug} · {b.owner_email ?? "sem e-mail"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="brand">{planOf(b).name}</Badge>
                        <Badge tone={statusTone(b.plan_status)}>
                          {PLAN_STATUS_LABELS[b.plan_status as PlanStatus] ?? b.plan_status}
                        </Badge>
                        {custom ? <Badge tone="warning">Limite combinado</Badge> : null}
                        {!b.onboarding_completed_at ? <Badge>Onboarding</Badge> : null}
                      </div>
                    </div>
                    <p className="text-sm text-ink-2">
                      Equipe {Number(b.members)}/{max ?? "∞"} · Mensagens {b.messages_this_month}/
                      {msgLimit} no mês · Desde {formatAdminDate(b.created_at)}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link className="min-h-11 py-3 font-semibold text-brand" href={pageHref(page - 1)}>
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link className="min-h-11 py-3 font-semibold text-brand" href={pageHref(page + 1)}>
              Próxima →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </AdminBody>
  );
}
