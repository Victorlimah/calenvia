import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken, invitationProblem } from "@/lib/team/invitations";
import { inviteTokenFromPath } from "./access";

export type TeamInviteCheck = { valid: false } | { valid: true; email: string | null };

/**
 * Confere, pelo servidor, se `next` aponta para um convite da equipe (CAL-112) ainda válido.
 * É o único jeito de criar conta pela tela de cadastro no modo convite (CAL-135).
 */
export async function checkTeamInvitePath(
  next: string | null | undefined,
): Promise<TeamInviteCheck> {
  const token = inviteTokenFromPath(next);
  if (!token) return { valid: false };
  const { data } = await createSupabaseAdminClient()
    .from("business_invitations")
    .select("email, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  if (!data || invitationProblem(data)) return { valid: false };
  return { valid: true, email: data.email?.toLowerCase() ?? null };
}
