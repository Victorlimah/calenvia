"use server";

import { redirect } from "next/navigation";
import { invalid, type ActionResult } from "@/lib/action-result";
import { safeNextPath } from "@/lib/auth/paths";
import { appUrl } from "@/lib/hosts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { track } from "@/lib/metrics";
import { normalizeRefCode } from "@/lib/referrals";
import {
  authErrorMessage,
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

// Importante: não usar redirect() para caminhos internos aqui. O redirect de uma server action
// é resolvido sem passar pelo middleware (que faz o rewrite por host) e cairia na rota errada.
// Devolvemos o destino e o navegador navega (router.push), passando pelo middleware.

export async function signInAction(
  input: unknown,
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true, data: { redirectTo: safeNextPath(next) } };
}

export async function signUpAction(
  input: unknown,
  plan?: string,
  refCode?: string,
  /** Para onde ir depois (ex.: aceitar um convite da equipe, CAL-112). */
  next?: string,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const nextPath = next
    ? safeNextPath(next)
    : plan
      ? `/onboarding?plano=${encodeURIComponent(plan)}`
      : "/onboarding";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        plan_intent: plan ?? null,
        ref_code: normalizeRefCode(refCode),
      },
      emailRedirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(nextPath)}`),
    },
  });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  // Supabase devolve usuário sem identidades quando o e-mail já existe (proteção contra enumeração).
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: authErrorMessage("already registered") };
  }
  await track("signup", plan ? { props: { plan } } : {});
  if (!data.session) {
    return { ok: true, message: "Enviamos um link de confirmação para o seu e-mail." };
  }
  return { ok: true, data: { redirectTo: nextPath } };
}

export async function signInWithGoogleAction(next?: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: appUrl(`/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`),
    },
  });
  if (error || !data.url) return { ok: false, error: authErrorMessage(error?.message) };
  redirect(data.url);
}

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: appUrl("/auth/callback?next=/nova-senha"),
  });
  if (error && !/rate limit/i.test(error.message)) {
    return { ok: false, error: authErrorMessage(error.message) };
  }
  // Mesma resposta exista ou não a conta.
  return {
    ok: true,
    message:
      "Se existir uma conta com esse e-mail, você vai receber um link para criar uma nova senha.",
  };
}

export async function updatePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error.message) };
  return { ok: true, message: "Senha alterada." };
}

export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return { ok: true };
}
