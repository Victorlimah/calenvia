import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { can, type Permission, type Role } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Business = Tables<"businesses">;

/** Cookie com o último negócio escolhido no seletor (CAL-112). */
export const CURRENT_BUSINESS_COOKIE = "calenvia_business";

export type Membership = {
  business: Business;
  role: Role;
  staffMemberId: string | null;
  userId: string;
};

/** Negócios de que o usuário logado é membro ativo, do mais antigo para o mais novo. */
export const getMyMemberships = cache(async (): Promise<Membership[]> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("business_members")
    .select("role, staff_member_id, created_at, businesses!inner(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");
  return (data ?? []).map((m) => ({
    business: m.businesses as unknown as Business,
    role: m.role as Role,
    staffMemberId: m.staff_member_id,
    userId: user.id,
  }));
});

/** Membro no negócio atual: o do cookie, se ainda for membro; senão, o primeiro (dono primeiro). */
export const getCurrentMember = cache(async (): Promise<Membership | null> => {
  const list = await getMyMemberships();
  if (list.length === 0) return null;
  const chosen = (await cookies()).get(CURRENT_BUSINESS_COOKIE)?.value;
  return (
    list.find((m) => m.business.id === chosen) ??
    list.find((m) => m.role === "owner") ??
    list[0] ??
    null
  );
});

/** Negócio atual do usuário logado, ou null. */
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  return (await getCurrentMember())?.business ?? null;
});

/** Membro do negócio atual ou manda para o onboarding (quem não tem negócio cria o seu). */
export async function requireMember(): Promise<Membership> {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  return member;
}

/** Negócio atual ou manda para o onboarding. */
export async function requireBusiness(): Promise<Business> {
  return (await requireMember()).business;
}

/** Negócio com onboarding concluído (painel principal). */
export async function requireReadyBusiness(): Promise<Business> {
  const business = await requireBusiness();
  if (!business.onboarding_completed_at) redirect("/onboarding");
  return business;
}

/** Membro com onboarding concluído. */
export async function requireReadyMember(): Promise<Membership> {
  const member = await requireMember();
  if (!member.business.onboarding_completed_at) redirect("/onboarding");
  return member;
}

/** Página que exige uma permissão: sem ela, volta para a agenda. */
export async function requirePermission(perm: Permission): Promise<Membership> {
  const member = await requireReadyMember();
  if (!can(member, perm)) redirect("/");
  return member;
}

/** Para server actions: o membro, se tiver a permissão; senão null (a action responde o erro). */
export async function memberWith(perm: Permission): Promise<Membership | null> {
  const member = await getCurrentMember();
  return member && can(member, perm) ? member : null;
}

export const NO_PERMISSION = "Você não tem permissão para fazer isso.";

/**
 * Para server actions: negócio atual, se o membro tiver a permissão. Sem ela, lança erro (a
 * interface já esconde a ação; isto é a defesa no servidor, e a RLS é a última barreira).
 */
export async function requireBusinessFor(perm: Permission): Promise<Business> {
  const member = await requireMember();
  if (!can(member, perm)) throw new Error(NO_PERMISSION);
  return member.business;
}
