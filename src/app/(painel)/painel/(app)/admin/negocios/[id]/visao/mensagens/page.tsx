import type { Metadata } from "next";
import { Badge, EmptyState } from "@/components/ui";
import { formatAdminDateTime } from "@/lib/admin/format";
import { maskPhone, MESSAGE_TYPE_LABELS } from "@/lib/admin/support";
import { openViewAs } from "@/lib/admin/view-as-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type RecordedSkipReason, SKIP_REASON_LABELS } from "@/lib/whatsapp/message-settings";
import { AdminBody } from "../../../../ui";
import { ViewSection } from "../ui";

export const metadata: Metadata = { title: "Mensagens do cliente — Administração Calenvia" };

const STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  queued: { label: "Na fila", tone: "neutral" },
  sent: { label: "Enviada", tone: "success" },
  delivered: { label: "Entregue", tone: "success" },
  read: { label: "Lida", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
  skipped: { label: "Não enviada", tone: "warning" },
};

export default async function ViewAsMessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await openViewAs(id, "mensagens");
  const { data, error } = await createSupabaseAdminClient()
    .from("messages")
    .select("id, type, to_number, template, status, error, skip_reason, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const list = data ?? [];

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Mensagens</h1>
      <ViewSection title="Últimas 50 mensagens">
        {error ? (
          <p className="text-sm text-danger">Não foi possível carregar as mensagens.</p>
        ) : list.length === 0 ? (
          <EmptyState title="Nenhuma mensagem ainda" />
        ) : (
          <ul className="divide-y divide-line text-sm" aria-label="Mensagens">
            {list.map((m) => {
              const st = STATUS[m.status] ?? { label: m.status, tone: "neutral" as const };
              const detail =
                m.status === "skipped"
                  ? (SKIP_REASON_LABELS[m.skip_reason as RecordedSkipReason] ?? m.skip_reason)
                  : m.status === "failed"
                    ? m.error
                    : m.template === "wa.me"
                      ? "enviada pelo dono (wa.me)"
                      : null;
              return (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {MESSAGE_TYPE_LABELS[m.type] ?? m.type} · {maskPhone(m.to_number)}
                    </p>
                    <p className="text-muted">
                      {formatAdminDateTime(m.created_at)}
                      {detail ? ` · ${detail}` : ""}
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </ViewSection>
    </AdminBody>
  );
}
