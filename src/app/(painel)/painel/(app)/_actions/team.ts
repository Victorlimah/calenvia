"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import {
  CURRENT_BUSINESS_COOKIE,
  getMyMemberships,
  NO_PERMISSION,
  requireWritableMember,
} from "@/lib/business/current";
import { appUrl } from "@/lib/hosts";
import { canAddMember, maxMembers } from "@/lib/plans";
import { can, canChangeMember, INVITABLE_ROLES, type Role } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken, newInviteToken, invitationProblem } from "@/lib/team/invitations";

const uuid = z.string().uuid();

/** Seletor de negócio (CAL-112): lembra o último escolhido. */
export async function switchBusinessAction(businessId: string): Promise<ActionResult> {
  const list = await getMyMemberships();
  if (!list.some((m) => m.business.id === businessId))
    return { ok: false, error: "Negócio não encontrado." };
  (await cookies()).set(CURRENT_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/painel", "layout");
  return { ok: true };
}

const inviteInput = z
  .object({
    email: z.string().trim().toLowerCase().email("E-mail inválido.").max(320).or(z.literal("")),
    role: z.enum(INVITABLE_ROLES as [Exclude<Role, "owner">, ...Exclude<Role, "owner">[]]),
    staffMemberId: uuid.nullable(),
    newStaffName: z.string().trim().max(80).optional(),
  })
  .refine((v) => v.role !== "staff" || v.staffMemberId || v.newStaffName, {
    message: "Escolha o cadastro de profissional ou digite o nome para criar um.",
    path: ["staffMemberId"],
  });

/** Pessoas que contam no limite do plano: membros ativos + convites pendentes. */
async function seatsUsed(businessId: string, now = new Date()): Promise<number> {
  const db = createSupabaseAdminClient();
  const [{ count: members }, { count: invites }] = await Promise.all([
    db
      .from("business_members")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "active"),
    db
      .from("business_invitations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString()),
  ]);
  return (members ?? 0) + (invites ?? 0);
}

export async function createInvitationAction(
  raw: unknown,
): Promise<ActionResult<{ link: string }>> {
  const member = await requireWritableMember();
  if (!can(member, "team.manage")) return { ok: false, error: NO_PERMISSION };
  const parsed = inviteInput.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const v = parsed.data;
  const { business } = member;
  if (!canAddMember(business, await seatsUsed(business.id))) {
    const max = maxMembers(business);
    return {
      ok: false,
      error: `Seu negócio permite ${max} ${max === 1 ? "pessoa" : "pessoas"} com acesso. Faça upgrade ou fale com o suporte para convidar mais.`,
    };
  }
  const db = createSupabaseAdminClient();
  let staffMemberId: string | null = null;
  if (v.role === "staff") {
    if (v.staffMemberId) {
      const { data: staff } = await db
        .from("staff_members")
        .select("id")
        .eq("id", v.staffMemberId)
        .eq("business_id", business.id)
        .maybeSingle();
      if (!staff) return { ok: false, error: "Profissional não encontrado." };
      const { data: taken } = await db
        .from("business_members")
        .select("id")
        .eq("business_id", business.id)
        .eq("staff_member_id", staff.id)
        .eq("status", "active")
        .maybeSingle();
      if (taken) return { ok: false, error: "Esse profissional já tem um acesso." };
      staffMemberId = staff.id;
    } else {
      const { data: created, error } = await db
        .from("staff_members")
        .insert({ business_id: business.id, name: v.newStaffName! })
        .select("id")
        .single();
      if (error || !created) return { ok: false, error: "Não foi possível criar o profissional." };
      staffMemberId = created.id;
    }
  }
  const token = newInviteToken();
  const { error } = await db.from("business_invitations").insert({
    business_id: business.id,
    email: v.email || null,
    role: v.role,
    staff_member_id: staffMemberId,
    token_hash: hashInviteToken(token),
    invited_by: member.userId,
  });
  if (error) return { ok: false, error: "Não foi possível criar o convite." };
  revalidatePath("/painel/negocio/equipe");
  return { ok: true, data: { link: appUrl(`/convite/${token}`) }, message: "Convite criado." };
}

/** Gera um link novo para um convite pendente (o antigo deixa de valer). */
export async function resendInvitationAction(id: string): Promise<ActionResult<{ link: string }>> {
  const member = await requireWritableMember();
  if (!can(member, "team.manage") || !uuid.safeParse(id).success)
    return { ok: false, error: NO_PERMISSION };
  const token = newInviteToken();
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("business_invitations")
    .update({
      token_hash: hashInviteToken(token),
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    })
    .eq("id", id)
    .eq("business_id", member.business.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Convite não encontrado." };
  revalidatePath("/painel/negocio/equipe");
  return { ok: true, data: { link: appUrl(`/convite/${token}`) }, message: "Novo link gerado." };
}

export async function revokeInvitationAction(id: string): Promise<ActionResult> {
  const member = await requireWritableMember();
  if (!can(member, "team.manage") || !uuid.safeParse(id).success)
    return { ok: false, error: NO_PERMISSION };
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", member.business.id)
    .is("accepted_at", null)
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, error: "Convite não encontrado." };
  revalidatePath("/painel/negocio/equipe");
  return { ok: true, message: "Convite cancelado." };
}

async function loadTarget(businessId: string, id: string) {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("business_members")
    .select("id, role, user_id, status")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();
  return data;
}

const roleInput = z.object({
  memberId: uuid,
  role: z.enum(INVITABLE_ROLES as [Exclude<Role, "owner">, ...Exclude<Role, "owner">[]]),
  staffMemberId: uuid.nullable(),
});

export async function changeMemberRoleAction(raw: unknown): Promise<ActionResult> {
  const member = await requireWritableMember();
  const parsed = roleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const target = await loadTarget(member.business.id, parsed.data.memberId);
  if (!target || target.status !== "active") return { ok: false, error: "Pessoa não encontrada." };
  if (!canChangeMember(member, target)) return { ok: false, error: NO_PERMISSION };
  if (parsed.data.role === "staff" && !parsed.data.staffMemberId)
    return { ok: false, error: "Escolha o cadastro de profissional." };
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("business_members")
    .update({ role: parsed.data.role, staff_member_id: parsed.data.staffMemberId })
    .eq("id", target.id);
  if (error)
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Esse profissional já tem um acesso."
          : "Não foi possível mudar o papel.",
    };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Papel atualizado." };
}

/** Liga (ou desliga) o acesso de qualquer membro, inclusive o dono, a um cadastro de profissional. */
export async function linkMemberStaffAction(raw: unknown): Promise<ActionResult> {
  const member = await requireWritableMember();
  const parsed = z.object({ memberId: uuid, staffMemberId: uuid.nullable() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const target = await loadTarget(member.business.id, parsed.data.memberId);
  if (!target || target.status !== "active") return { ok: false, error: "Pessoa não encontrada." };
  // O dono pode ligar o próprio acesso; ninguém mexe no dono além dele.
  const self = target.user_id === member.userId;
  if (!can(member, "team.manage") || (target.role === "owner" && !self))
    return { ok: false, error: NO_PERMISSION };
  if (target.role === "staff" && !parsed.data.staffMemberId)
    return { ok: false, error: "Profissional precisa estar ligado a um cadastro." };
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("business_members")
    .update({ staff_member_id: parsed.data.staffMemberId })
    .eq("id", target.id);
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "Esse profissional já tem um acesso." : "Não foi possível.",
    };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Profissional ligado." };
}

/** Remove o acesso na hora. Agendamentos e o cadastro de profissional continuam. */
export async function removeMemberAction(id: string): Promise<ActionResult> {
  const member = await requireWritableMember();
  if (!uuid.safeParse(id).success) return { ok: false, error: "Pedido inválido." };
  const target = await loadTarget(member.business.id, id);
  if (!target || target.status !== "active") return { ok: false, error: "Pessoa não encontrada." };
  if (!canChangeMember(member, target)) return { ok: false, error: NO_PERMISSION };
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from("business_members")
    .update({ status: "removed", removed_at: new Date().toISOString(), staff_member_id: null })
    .eq("id", target.id);
  if (error) return { ok: false, error: "Não foi possível remover." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Acesso removido." };
}

/** Aceita um convite (link /convite/{token}) com a conta logada. */
export async function acceptInvitationAction(token: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { ok: false, error: "Convite inválido." };
  const db = createSupabaseAdminClient();
  const { data: inv } = await db
    .from("business_invitations")
    .select("id, business_id, role, staff_member_id, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  const problem = invitationProblem(inv);
  if (problem || !inv) return { ok: false, error: problem ?? "Convite inválido." };

  const { data: existing } = await db
    .from("business_members")
    .select("id, role, status")
    .eq("business_id", inv.business_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.status === "active")
    return { ok: false, error: "Você já faz parte da equipe deste negócio." };

  // Marca o convite antes (uso único: só um aceite ganha a corrida).
  const { data: claimed } = await db
    .from("business_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", inv.id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return { ok: false, error: "Este convite já foi usado." };

  const row = {
    business_id: inv.business_id,
    user_id: user.id,
    role: inv.role,
    staff_member_id: inv.staff_member_id,
    status: "active",
    removed_at: null,
    display_name: (user.user_metadata?.name as string | undefined) || null,
    email: user.email ?? null,
  };
  const { error } = existing
    ? await db.from("business_members").update(row).eq("id", existing.id)
    : await db.from("business_members").insert(row);
  if (error) {
    await db
      .from("business_invitations")
      .update({ accepted_at: null, accepted_by: null })
      .eq("id", inv.id);
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Esse profissional já tem um acesso."
          : "Não foi possível entrar na equipe.",
    };
  }
  (await cookies()).set(CURRENT_BUSINESS_COOKIE, inv.business_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pronto! Você entrou na equipe." };
}
