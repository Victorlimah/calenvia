import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatAdminDateTime } from "@/lib/admin/format";
import {
  parseSupportFilter,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_TOPIC_LABELS,
  type SupportStatus,
} from "@/lib/admin/support";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/phone";
import { planOf } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../ui";
import { SupportReplyForm } from "./support-reply-form";

export const metadata: Metadata = { title: "Suporte — Administração Calenvia" };

const PAGE_SIZE = 50;
const FILTERS: { value: SupportStatus | "all"; label: string }[] = [
  ...SUPPORT_STATUSES.map((s) => ({ value: s, label: SUPPORT_STATUS_LABELS[s] })),
  { value: "all", label: "Todos" },
];

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const filter = parseSupportFilter((await searchParams).status);
  const db = createSupabaseAdminClient();
  let query = db
    .from("support_requests")
    .select(
      "id, business_id, topic, message, priority, status, admin_reply, answered_at, created_at, businesses(name, slug, plan, whatsapp, owner_id)",
      { count: "exact" },
    )
    .order("priority", { ascending: false })
    .order("created_at", { ascending: filter === "open" })
    .limit(PAGE_SIZE);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, count, error } = await query;
  const rows = data ?? [];

  const ownerIds = [...new Set(rows.map((r) => r.businesses?.owner_id).filter(Boolean))];
  const owners = await Promise.all(
    ownerIds.map(async (id) => [id, (await db.auth.admin.getUserById(id!)).data.user?.email]),
  );
  const emailOf = new Map(owners as [string, string | undefined][]);

  return (
    <AdminBody>
      <AdminTitle
        title="Suporte"
        description={`${count ?? 0} ${count === 1 ? "pedido" : "pedidos"}${filter === "all" ? "" : ` com status “${SUPPORT_STATUS_LABELS[filter].toLowerCase()}”`}. Prioritários (Pro+) primeiro.`}
      />

      <nav aria-label="Filtrar pedidos" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "open" ? "/admin/suporte" : `/admin/suporte?status=${f.value}`}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold",
              f.value === filter ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <EmptyState title="Não foi possível carregar" description="Recarregue a página." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nenhum pedido aqui"
          description={filter === "open" ? "Nenhum pedido aguardando resposta." : "Mude o filtro."}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const b = r.businesses;
            const email = b?.owner_id ? emailOf.get(b.owner_id) : undefined;
            return (
              <li key={r.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <h2 className="font-display text-lg font-bold text-ink">
                        {SUPPORT_TOPIC_LABELS[r.topic] ?? r.topic} ·{" "}
                        <Link
                          href={`/admin/negocios/${r.business_id}`}
                          className="text-brand underline"
                        >
                          {b?.name ?? "Negócio"}
                        </Link>
                      </h2>
                      <p className="text-sm text-muted">
                        {formatAdminDateTime(r.created_at)}
                        {b ? ` · ${planOf(b).name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.priority ? <Badge tone="danger">Prioritário</Badge> : null}
                      <Badge tone={r.status === "open" ? "warning" : "success"}>
                        {SUPPORT_STATUS_LABELS[r.status as SupportStatus] ?? r.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-ink">{r.message}</p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
                    {email ? (
                      <a href={`mailto:${email}`} className="font-semibold text-brand underline">
                        {email}
                      </a>
                    ) : null}
                    {b?.whatsapp ? (
                      <a
                        href={`https://wa.me/${b.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand underline"
                      >
                        WhatsApp {formatPhone(b.whatsapp)}
                      </a>
                    ) : null}
                    {r.answered_at ? (
                      <span className="text-muted">
                        Respondido em {formatAdminDateTime(r.answered_at)}
                      </span>
                    ) : null}
                  </p>
                  <SupportReplyForm
                    requestId={r.id}
                    defaults={{
                      status: r.status as SupportStatus,
                      admin_reply: r.admin_reply ?? "",
                    }}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AdminBody>
  );
}
