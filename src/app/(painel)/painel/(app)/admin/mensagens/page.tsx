import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { formatAdminDateTime } from "@/lib/admin/format";
import {
  FAILURE_PERIODS,
  maskPhone,
  MESSAGE_TYPE_LABELS,
  parseFailurePeriod,
} from "@/lib/admin/support";
import { cn } from "@/lib/cn";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type RecordedSkipReason, SKIP_REASON_LABELS } from "@/lib/whatsapp/message-settings";
import { AdminBody, AdminTitle } from "../ui";

export const metadata: Metadata = { title: "Mensagens com falha — Administração Calenvia" };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f-]{36}$/i;

type Search = { negocio?: string; dias?: string; tipo?: string; pagina?: string };

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const businessId = sp.negocio && UUID.test(sp.negocio) ? sp.negocio : null;
  const days = parseFailurePeriod(sp.dias);
  const status = sp.tipo === "skipped" ? "skipped" : "failed";
  const page = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const db = createSupabaseAdminClient();
  let list = db
    .from("messages")
    .select("id, business_id, type, to_number, status, error, skip_reason, created_at", {
      count: "exact",
    })
    .eq("status", status)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  let failed7 = db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since7);
  if (businessId) {
    list = list.eq("business_id", businessId);
    failed7 = failed7.eq("business_id", businessId);
  }
  const [messages, failures7, topErrors, business] = await Promise.all([
    list,
    failed7,
    db.rpc("admin_message_failures_summary", {
      p_since: since7,
      p_business_id: businessId ?? undefined,
      p_limit: 5,
    }),
    businessId
      ? db.from("businesses").select("id, name").eq("id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const rows = messages.data ?? [];
  const total = messages.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ids = [...new Set(rows.map((m) => m.business_id))];
  const { data: names } = ids.length
    ? await db.from("businesses").select("id, name").in("id", ids)
    : { data: [] };
  const nameOf = new Map((names ?? []).map((b) => [b.id, b.name]));

  const href = (patch: Partial<Search>) => {
    const next: Search = {
      negocio: businessId ?? undefined,
      dias: days === 7 ? undefined : String(days),
      tipo: status === "skipped" ? "skipped" : undefined,
      ...patch,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/mensagens?${s}` : "/admin/mensagens";
  };

  return (
    <AdminBody>
      <AdminTitle
        title={status === "failed" ? "Mensagens com falha" : "Mensagens não enviadas"}
        description={
          business.data
            ? `Só de ${business.data.name}.`
            : "Todas as mensagens automáticas de todos os negócios."
        }
        back={
          business.data
            ? { href: `/admin/negocios/${business.data.id}`, label: business.data.name }
            : undefined
        }
      />

      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <Card className="space-y-1">
          <p className="text-sm text-muted">Falhas nos últimos 7 dias</p>
          <p className="font-display text-2xl font-extrabold text-ink">{failures7.count ?? 0}</p>
        </Card>
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Erros mais comuns (7 dias)</h2>
          {(topErrors.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhuma falha.</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {(topErrors.data ?? []).map((e) => (
                <li key={e.error} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words text-ink-2">{e.error}</span>
                  <span className="font-semibold text-ink">{Number(e.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <nav aria-label="Filtros" className="flex flex-wrap gap-1">
        <FilterLink
          href={href({ tipo: undefined, pagina: undefined })}
          active={status === "failed"}
        >
          Com falha
        </FilterLink>
        <FilterLink
          href={href({ tipo: "skipped", pagina: undefined })}
          active={status === "skipped"}
        >
          Não enviadas
        </FilterLink>
        <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
        {FAILURE_PERIODS.map((d) => (
          <FilterLink
            key={d}
            href={href({ dias: d === 7 ? undefined : String(d), pagina: undefined })}
            active={d === days}
          >
            {d} dias
          </FilterLink>
        ))}
        {businessId ? (
          <FilterLink href={href({ negocio: undefined, pagina: undefined })} active={false}>
            Todos os negócios
          </FilterLink>
        ) : null}
      </nav>

      {messages.error ? (
        <EmptyState title="Não foi possível carregar" description="Recarregue a página." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description={`Nenhuma mensagem ${status === "failed" ? "com falha" : "não enviada"} nos últimos ${days} dias.`}
        />
      ) : (
        <ul className="space-y-2" aria-label="Mensagens">
          {rows.map((m) => (
            <li key={m.id}>
              <Card className="space-y-1 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold text-ink">
                    {MESSAGE_TYPE_LABELS[m.type] ?? m.type} ·{" "}
                    <Link
                      href={href({ negocio: m.business_id, pagina: undefined })}
                      className="text-brand underline"
                    >
                      {nameOf.get(m.business_id) ?? "Negócio"}
                    </Link>
                  </span>
                  <span className="text-muted">{formatAdminDateTime(m.created_at)}</span>
                </div>
                <p className="text-ink-2">Para {maskPhone(m.to_number)}</p>
                <p className="break-words text-ink">
                  {m.status === "skipped"
                    ? (SKIP_REASON_LABELS[m.skip_reason as RecordedSkipReason] ?? m.skip_reason)
                    : (m.error ?? "Sem detalhe do erro")}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link
              className="min-h-11 py-3 font-semibold text-brand"
              href={href({ pagina: page - 1 > 1 ? String(page - 1) : undefined })}
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link
              className="min-h-11 py-3 font-semibold text-brand"
              href={href({ pagina: String(page + 1) })}
            >
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

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold",
        active ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2",
      )}
    >
      {children}
    </Link>
  );
}
