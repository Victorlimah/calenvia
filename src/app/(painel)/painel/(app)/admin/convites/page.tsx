import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatAdminDate } from "@/lib/admin/format";
import {
  canCancelOwnerInvitation,
  canRegenerateOwnerInvitation,
  OWNER_INVITATION_STATUS_LABELS,
  ownerInvitationStatus,
  type OwnerInvitationStatus,
} from "@/lib/admin/owner-invitations";
import { segmentLabel } from "@/lib/business/segments";
import { formatPhone } from "@/lib/phone";
import { planOf } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../ui";
import { InviteForm } from "./invite-form";
import { InviteRowActions } from "./invite-row-actions";

export const metadata: Metadata = { title: "Convites — Administração Calenvia" };
export const dynamic = "force-dynamic";

const TONES: Record<OwnerInvitationStatus, "success" | "warning" | "danger" | "neutral"> = {
  sent: "neutral",
  opened: "warning",
  accepted: "success",
  expired: "danger",
  canceled: "neutral",
};

/** Convidar negócio e acompanhar os convites (CAL-136). */
export default async function ConvitesPage() {
  const { data } = await createSupabaseAdminClient()
    .from("owner_invitations")
    .select(
      "id, business_id, email, owner_name, whatsapp, expires_at, opened_at, accepted_at, canceled_at, created_at, businesses(name, slug, segment, plan)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []).map((r) => ({ ...r, status: ownerInvitationStatus(r) }));

  return (
    <AdminBody>
      <AdminTitle
        title="Convites"
        description="Pré-cadastre o negócio e mande o link para o dono criar a senha e terminar a configuração."
      />

      <Card className="space-y-4">
        <h2 className="font-display text-xl font-bold text-ink">Convidar negócio</h2>
        <InviteForm />
      </Card>

      <section aria-labelledby="lista-convites" className="space-y-3">
        <h2 id="lista-convites" className="font-display text-xl font-bold text-ink">
          Convites ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <EmptyState
            title="Nenhum convite ainda"
            description="Os convites criados aparecem aqui, com o estado de cada um."
          />
        ) : (
          <ul className="space-y-3" aria-label="Convites">
            {rows.map((r) => {
              const b = r.businesses;
              return (
                <li key={r.id}>
                  <Card className="space-y-3" data-testid="owner-invite">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold text-ink">
                          {r.status === "accepted" ? (
                            <Link
                              href={`/admin/negocios/${r.business_id}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {b?.name}
                            </Link>
                          ) : (
                            b?.name
                          )}
                        </p>
                        <p className="text-sm text-ink-2">
                          {segmentLabel(b?.segment)} · Plano{" "}
                          {planOf({ plan: b?.plan ?? "basic" }).name} · {b?.slug}
                        </p>
                        <p className="mt-1 text-sm text-ink">
                          {r.owner_name} · <span className="break-all">{r.email}</span>
                          {r.whatsapp ? ` · ${formatPhone(r.whatsapp)}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Criado em {formatAdminDate(r.created_at)}
                          {r.status === "accepted" && r.accepted_at
                            ? ` · aceito em ${formatAdminDate(r.accepted_at)}`
                            : r.status === "canceled" || r.status === "expired"
                              ? ""
                              : ` · vale até ${formatAdminDate(r.expires_at)}`}
                          {r.opened_at && r.status === "opened"
                            ? ` · aberto em ${formatAdminDate(r.opened_at)}`
                            : ""}
                        </p>
                      </div>
                      <Badge tone={TONES[r.status]}>
                        {OWNER_INVITATION_STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                    {r.status !== "accepted" ? (
                      <InviteRowActions
                        invitationId={r.id}
                        canRegenerate={canRegenerateOwnerInvitation(r.status)}
                        canCancel={canCancelOwnerInvitation(r.status)}
                        canEdit={r.status !== "canceled"}
                        defaults={{
                          businessName: b?.name ?? "",
                          ownerName: r.owner_name,
                          email: r.email,
                          whatsapp: r.whatsapp ?? "",
                        }}
                      />
                    ) : (
                      <Link
                        href={`/admin/negocios/${r.business_id}`}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-2 hover:underline"
                      >
                        Ver negócio
                      </Link>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AdminBody>
  );
}
