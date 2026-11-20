import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken } from "@/lib/team/invitations";
import { ownerInvitationProblem } from "./owner-invitations";

export type OwnerInviteView =
  | { kind: "none" }
  | {
      kind: "problem";
      problem: "canceled" | "used" | "expired";
      businessName: string;
    }
  | {
      kind: "valid";
      tokenHash: string;
      businessName: string;
      ownerName: string;
      email: string;
      hasAccount: boolean;
    };

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,100}$/;

/**
 * Convite de dono pelo token do link (CAL-137). `none` = não é convite de dono (pode ser da
 * equipe ou inválido). Marca como "Aberto" na primeira visita.
 */
export async function loadOwnerInvitation(
  token: string,
  opts: { markOpened?: boolean } = {},
): Promise<OwnerInviteView> {
  if (!TOKEN_SHAPE.test(token)) return { kind: "none" };
  const db = createSupabaseAdminClient();
  const tokenHash = hashInviteToken(token);
  const { data: inv } = await db
    .from("owner_invitations")
    .select(
      "id, email, owner_name, expires_at, opened_at, accepted_at, canceled_at, businesses(name)",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!inv) return { kind: "none" };
  const businessName = inv.businesses?.name ?? "seu negócio";
  const problem = ownerInvitationProblem(inv);
  if (problem && problem !== "not_found") return { kind: "problem", problem, businessName };
  if (opts.markOpened && !inv.opened_at) {
    await db
      .from("owner_invitations")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", inv.id)
      .is("opened_at", null);
  }
  const { data: userId } = await db.rpc("auth_user_id_by_email", { p_email: inv.email });
  return {
    kind: "valid",
    tokenHash,
    businessName,
    ownerName: inv.owner_name,
    email: inv.email,
    hasAccount: Boolean(userId),
  };
}

const RPC_ERRORS: Record<string, string> = {
  invitation_not_found: "Convite não encontrado. Confira o link ou peça um novo.",
  invitation_canceled: "Este convite foi cancelado. Peça um novo ao suporte.",
  invitation_used: "Este convite já foi usado. Entre com seu e-mail e senha.",
  invitation_expired: "Este convite expirou. Peça um novo ao suporte.",
  invitation_email_mismatch: "Este convite é para outro e-mail.",
  business_has_owner: "Este negócio já tem dono. Fale com o suporte.",
};

/** Vincula a conta ao negócio do convite (uso único, atômico no banco). */
export async function acceptOwnerInvitationForUser(
  tokenHash: string,
  userId: string,
): Promise<{ ok: true; businessId: string } | { ok: false; error: string }> {
  const { data, error } = await createSupabaseAdminClient().rpc("accept_owner_invitation", {
    p_token_hash: tokenHash,
    p_user_id: userId,
  });
  if (error || !data) {
    const key = Object.keys(RPC_ERRORS).find((k) => error?.message.includes(k));
    return {
      ok: false,
      error: key ? RPC_ERRORS[key] : "Não foi possível aceitar o convite. Tente de novo.",
    };
  }
  return { ok: true, businessId: data };
}
