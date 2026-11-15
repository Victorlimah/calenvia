import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PlatformAdmin = { userId: string; email: string };

/** O usuário logado é da equipe da Calenvia (tabela platform_admins)? (CAL-114) */
export const getPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await createSupabaseAdminClient()
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? { userId: user.id, email: user.email ?? "" } : null;
});

/** Página da administração: quem não é admin recebe 404 (não revelamos que a tela existe). */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const admin = await getPlatformAdmin();
  if (!admin) notFound();
  return admin;
}
