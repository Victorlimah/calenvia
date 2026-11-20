/**
 * Convite de negócio pelo /admin (CAL-136). Funções puras (sem node:crypto), usadas no servidor
 * e nas telas. O token e o hash vêm de src/lib/team/invitations.ts (mesmo formato).
 */
import { z } from "zod";
import { SEGMENT_IDS } from "@/lib/business/segments";
import { PLAN_ORDER, type PlanId } from "@/lib/plans";
import { whatsappField } from "@/lib/validation/business";

export const OWNER_INVITE_TTL_DAYS = 7;

/** Link recém-gerado (só existe na resposta da action: o banco guarda o hash). */
export type InviteLink = {
  invitationId: string;
  businessId: string;
  link: string;
  whatsappLink: string | null;
  mailtoLink: string;
  message: string;
};

export type OwnerInvitationRow = {
  expires_at: string;
  opened_at: string | null;
  accepted_at: string | null;
  canceled_at: string | null;
};

export type OwnerInvitationStatus = "sent" | "opened" | "accepted" | "expired" | "canceled";

export const OWNER_INVITATION_STATUS_LABELS: Record<OwnerInvitationStatus, string> = {
  sent: "Enviado",
  opened: "Aberto",
  accepted: "Aceito",
  expired: "Expirado",
  canceled: "Cancelado",
};

/** Estado do convite: cancelado e aceito valem mais que a validade; aberto só se ainda vale. */
export function ownerInvitationStatus(
  inv: OwnerInvitationRow,
  now: Date = new Date(),
): OwnerInvitationStatus {
  if (inv.canceled_at) return "canceled";
  if (inv.accepted_at) return "accepted";
  if (new Date(inv.expires_at).getTime() <= now.getTime()) return "expired";
  return inv.opened_at ? "opened" : "sent";
}

/** Por que o convite não pode ser usado (mensagem para a pessoa), ou null se vale. */
export function ownerInvitationProblem(
  inv: OwnerInvitationRow | null | undefined,
  now: Date = new Date(),
): "not_found" | "canceled" | "used" | "expired" | null {
  if (!inv) return "not_found";
  const status = ownerInvitationStatus(inv, now);
  if (status === "canceled") return "canceled";
  if (status === "accepted") return "used";
  if (status === "expired") return "expired";
  return null;
}

/** Pode gerar um novo link? Só enquanto ninguém aceitou. */
export function canRegenerateOwnerInvitation(status: OwnerInvitationStatus): boolean {
  return status !== "accepted";
}

/** Pode cancelar? Só convite que ainda pode ser usado ou já venceu. */
export function canCancelOwnerInvitation(status: OwnerInvitationStatus): boolean {
  return status === "sent" || status === "opened" || status === "expired";
}

/** Texto pronto para mandar o convite pelo WhatsApp. */
export function ownerInvitationMessage(ownerName: string, businessName: string, link: string) {
  const first = ownerName.trim().split(/\s+/)[0] ?? "";
  return `Olá${first ? `, ${first}` : ""}! Sua conta da *${businessName}* na Calenvia está pronta. Abra o link para criar sua senha e terminar a configuração (vale por ${OWNER_INVITE_TTL_DAYS} dias): ${link}`;
}

const optionalLimit = (min: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z
      .number({ message: `${label}: use um número inteiro.` })
      .int(`${label}: use um número inteiro.`)
      .min(min, `${label}: o mínimo é ${min}.`)
      .max(100000, `${label}: o máximo é 100000.`)
      .nullable(),
  );

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail do dono.")
  .pipe(z.email("E-mail inválido."));

/** Formulário "Convidar negócio". */
export const ownerInviteSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "O nome do negócio precisa de pelo menos 2 letras.")
    .max(80, "Use no máximo 80 caracteres."),
  segment: z.enum(SEGMENT_IDS, { message: "Escolha o segmento." }),
  ownerName: z
    .string()
    .trim()
    .min(2, "Informe o nome do dono.")
    .max(80, "Use no máximo 80 caracteres."),
  email: emailField,
  whatsapp: whatsappField,
  plan: z.enum(PLAN_ORDER as [PlanId, ...PlanId[]], { message: "Escolha um plano." }),
  messageLimitOverride: optionalLimit(0, "Cota de mensagens"),
  memberLimitOverride: optionalLimit(1, "Limite de pessoas"),
  starterServices: z.boolean().default(true),
});

export type OwnerInviteInput = z.input<typeof ownerInviteSchema>;
export type OwnerInviteData = z.output<typeof ownerInviteSchema>;

/** Editar os dados pré-cadastrados de um convite ainda não aceito. */
export const ownerInviteEditSchema = ownerInviteSchema.pick({
  businessName: true,
  ownerName: true,
  email: true,
  whatsapp: true,
});

export type OwnerInviteEditInput = z.input<typeof ownerInviteEditSchema>;
