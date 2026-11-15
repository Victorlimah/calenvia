import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Alert } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { canChangeMember, type Role } from "@/lib/permissions";
import { canAddMember, maxMembers } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invitationStatus } from "@/lib/team/invitations";
import { TeamManager, type TeamInvite, type TeamPerson } from "./team-manager";

export const metadata: Metadata = { title: "Equipe e acessos — Calenvia" };

export default async function EquipePage() {
  const member = await requirePermission("team.manage");
  const { business } = member;
  const supabase = await createSupabaseServerClient();
  const [{ data: members }, { data: invites }, { data: staff }] = await Promise.all([
    supabase
      .from("business_members")
      .select("id, user_id, role, staff_member_id, display_name, email, created_at")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("created_at"),
    supabase
      .from("business_invitations")
      .select("id, email, role, staff_member_id, expires_at, accepted_at, revoked_at, created_at")
      .eq("business_id", business.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_members")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name"),
  ]);
  const staffName = new Map((staff ?? []).map((s) => [s.id, s.name]));
  const people: TeamPerson[] = (members ?? []).map((m) => ({
    id: m.id,
    name: m.display_name || m.email || "Sem nome",
    email: m.email,
    role: m.role as Role,
    staffMemberId: m.staff_member_id,
    staffName: m.staff_member_id ? (staffName.get(m.staff_member_id) ?? null) : null,
    self: m.user_id === member.userId,
    editable: canChangeMember(member, { role: m.role }),
    canLink: m.role !== "owner" || m.user_id === member.userId,
  }));
  const now = new Date();
  const pending: TeamInvite[] = (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role as Role,
    staffName: i.staff_member_id ? (staffName.get(i.staff_member_id) ?? null) : null,
    expired: invitationStatus(i, now) === "expired",
  }));
  const used = people.length + pending.filter((i) => !i.expired).length;
  const max = maxMembers(business);
  const linked = new Set(
    (members ?? []).map((m) => m.staff_member_id).filter((id): id is string => Boolean(id)),
  );

  return (
    <PageBody>
      <PageHeader
        title="Equipe e acessos"
        description="Cada pessoa entra com o próprio login e vê só o que o papel dela permite."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <p className="text-sm text-ink-2">
        {max === null
          ? `${used} ${used === 1 ? "pessoa" : "pessoas"} com acesso (sem limite no seu plano).`
          : `${used} de ${max} ${max === 1 ? "pessoa" : "pessoas"} com acesso.`}{" "}
        Profissionais sem login não contam.
      </p>
      {!canAddMember(business, used) ? (
        <Alert tone="info" title="Limite de acessos">
          Para convidar mais pessoas, faça upgrade do plano ou fale com o suporte para aumentar o
          limite.{" "}
          <Link href="/assinatura" className="font-semibold underline">
            Ver planos
          </Link>
        </Alert>
      ) : null}
      <TeamManager
        businessName={business.name}
        people={people}
        invites={pending}
        staff={(staff ?? []).map((s) => ({ id: s.id, name: s.name, linked: linked.has(s.id) }))}
        canInvite={canAddMember(business, used)}
      />
    </PageBody>
  );
}
