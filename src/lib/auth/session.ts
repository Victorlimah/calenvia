import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Usuário logado ou redireciona para /entrar. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}
