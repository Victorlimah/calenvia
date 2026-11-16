"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { appUrl } from "@/lib/hosts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/validation/auth";

const nameSchema = z.object({
  name: z.string().trim().min(2, "Digite seu nome.").max(80, "Nome muito longo."),
});

/** Nome da pessoa (CAL-119): vai para o login e para a lista da equipe de cada negócio. */
export async function updateAccountNameAction(input: unknown): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data.name } });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  // Só as linhas da própria pessoa (a RLS não deixa o membro mudar o próprio cadastro).
  await createSupabaseAdminClient()
    .from("business_members")
    .update({ display_name: parsed.data.name })
    .eq("user_id", user.id);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Nome salvo." };
}

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido."),
});

/** Troca de e-mail: o Supabase manda um link de confirmação para o endereço novo. */
export async function updateAccountEmailAction(input: unknown): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  if (parsed.data.email === user.email) return { ok: false, error: "Esse já é o seu e-mail." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: appUrl("/auth/callback?next=/ajustes/conta") },
  );
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return {
    ok: true,
    message: `Enviamos um link para ${parsed.data.email}. O e-mail muda quando você abrir o link.`,
  };
}
