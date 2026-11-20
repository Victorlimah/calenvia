"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import {
  acceptOwnerInvitationForUser,
  loadOwnerInvitation,
} from "@/lib/admin/owner-invitations-accept";
import { CURRENT_BUSINESS_COOKIE } from "@/lib/business/current";
import { track } from "@/lib/metrics";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/validation/auth";

const newAccountSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas não são iguais.",
    path: ["confirm"],
  });

const existingAccountSchema = z.object({
  password: z.string().min(1, "Digite a senha da sua conta."),
});

/**
 * CAL-137: aceitar o convite de dono. Conta nova: cria com a senha escolhida (e-mail do convite,
 * já confirmado). Conta que já existe: só vincula se a pessoa acertar a senha dessa conta.
 * Depois, entra logada e vai para o onboarding.
 */
export async function acceptOwnerInvitationAction(
  token: string,
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  if (!(await checkRateLimit("invite"))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const inv = await loadOwnerInvitation(token);
  if (inv.kind === "none") {
    return { ok: false, error: "Convite não encontrado. Confira o link ou peça um novo." };
  }
  if (inv.kind === "problem") {
    return {
      ok: false,
      error:
        inv.problem === "used"
          ? "Este convite já foi usado. Entre com seu e-mail e senha."
          : inv.problem === "expired"
            ? "Este convite expirou. Peça um novo ao suporte."
            : "Este convite foi cancelado. Peça um novo ao suporte.",
    };
  }

  const supabase = await createSupabaseServerClient();
  let userId: string;
  let created = false;
  if (inv.hasAccount) {
    const parsed = existingAccountSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: inv.email,
      password: parsed.data.password,
    });
    if (error || !data.user) {
      return {
        ok: false,
        error: "Senha incorreta. Use a senha da conta que você já tem com esse e-mail.",
        fieldErrors: { password: "Senha incorreta." },
      };
    }
    userId = data.user.id;
  } else {
    const parsed = newAccountSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
      email: inv.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: inv.ownerName },
    });
    if (error || !data.user) return { ok: false, error: authErrorMessage(error?.message) };
    userId = data.user.id;
    created = true;
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: inv.email,
      password: parsed.data.password,
    });
    if (signInError) return { ok: false, error: authErrorMessage(signInError.message) };
  }

  const accepted = await acceptOwnerInvitationForUser(inv.tokenHash, userId);
  if (!accepted.ok) {
    // Conta criada agora e convite recusado (ex.: outro aceite ao mesmo tempo): desfaz.
    if (created) {
      await supabase.auth.signOut();
      await createSupabaseAdminClient().auth.admin.deleteUser(userId);
    }
    return accepted;
  }
  // O painel abre direto no negócio do convite (a pessoa pode ter outros).
  (await cookies()).set(CURRENT_BUSINESS_COOKIE, accepted.businessId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  await track("signup", { businessId: accepted.businessId, props: { via: "owner_invite" } });
  return { ok: true, data: { redirectTo: "/onboarding" } };
}
