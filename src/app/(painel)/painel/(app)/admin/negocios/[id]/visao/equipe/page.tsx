import type { Metadata } from "next";
import { Badge, EmptyState } from "@/components/ui";
import { formatAdminDate } from "@/lib/admin/format";
import { openViewAs } from "@/lib/admin/view-as-server";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { maxMembers } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody } from "../../../../ui";
import { ViewSection } from "../ui";

export const metadata: Metadata = { title: "Equipe do cliente — Administração Calenvia" };

export default async function ViewAsTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await openViewAs(id, "equipe");
  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const [members, invites] = await Promise.all([
    db
      .from("business_members")
      .select("id, role, display_name, email, created_at, staff_members(name)")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("created_at"),
    db
      .from("business_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("business_id", business.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false }),
  ]);
  const memberList = members.data ?? [];
  const inviteList = invites.data ?? [];
  const max = maxMembers(business);

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Equipe e convites</h1>
      <p className="text-sm text-ink-2">
        {memberList.length + inviteList.length} de {max ?? "ilimitado"} acessos usados (contando
        convites pendentes).
      </p>
      <ViewSection title="Pessoas com acesso">
        <ul className="divide-y divide-line text-sm" aria-label="Pessoas com acesso">
          {memberList.map((m) => (
            <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="text-ink">
                <strong>{m.display_name ?? m.email ?? "Sem nome"}</strong>
                {m.email && m.display_name ? ` · ${m.email}` : ""}
                {m.staff_members?.name ? ` · agenda de ${m.staff_members.name}` : ""}
              </span>
              <span className="flex items-center gap-2 text-muted">
                <Badge tone={m.role === "owner" ? "brand" : "neutral"}>
                  {ROLE_LABELS[m.role as Role] ?? m.role}
                </Badge>
                desde {formatAdminDate(m.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </ViewSection>
      <ViewSection title="Convites pendentes">
        {inviteList.length === 0 ? (
          <EmptyState title="Nenhum convite pendente" />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {inviteList.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-ink">{i.email ?? "Convite por link"}</span>
                <span className="text-muted">
                  {ROLE_LABELS[i.role as Role] ?? i.role} · vence em {formatAdminDate(i.expires_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ViewSection>
    </AdminBody>
  );
}
