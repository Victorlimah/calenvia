/**
 * Convites da equipe (CAL-112). O token vai só no link; o banco guarda o hash (SHA-256), então
 * quem lê o banco não consegue usar o convite. Validade de 7 dias e uso único.
 */
import { createHash, randomBytes } from "node:crypto";

import { INVITE_TTL_DAYS } from "./invitation-text";

export { INVITE_TTL_DAYS };

export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InvitationRow = {
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

/** Por que o convite não vale (mensagem para a pessoa), ou null se vale. */
export function invitationProblem(
  inv: InvitationRow | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!inv) return "Convite não encontrado. Confira o link ou peça um novo.";
  if (inv.revoked_at) return "Este convite foi cancelado. Peça um novo para quem convidou você.";
  if (inv.accepted_at) return "Este convite já foi usado.";
  if (new Date(inv.expires_at) <= now)
    return "Este convite expirou (vale por 7 dias). Peça um novo para quem convidou você.";
  return null;
}

export type InvitationStatus = "pending" | "expired" | "accepted" | "revoked";

export function invitationStatus(inv: InvitationRow, now: Date = new Date()): InvitationStatus {
  if (inv.revoked_at) return "revoked";
  if (inv.accepted_at) return "accepted";
  return new Date(inv.expires_at) <= now ? "expired" : "pending";
}

export { invitationMessage } from "./invitation-text";
