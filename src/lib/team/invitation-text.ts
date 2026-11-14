/** Textos do convite da equipe (CAL-112). Sem node:crypto, para poder usar no navegador. */
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export const INVITE_TTL_DAYS = 7;

/** Texto pronto para mandar o convite pelo WhatsApp. */
export function invitationMessage(businessName: string, role: Role, link: string): string {
  return `Olá! Você foi convidado(a) para a equipe da *${businessName}* na Calenvia, como ${ROLE_LABELS[role].toLowerCase()}. Para entrar, abra o link (vale por ${INVITE_TTL_DAYS} dias): ${link}`;
}
