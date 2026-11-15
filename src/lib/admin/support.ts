/**
 * Suporte e mensagens com falha na administração (CAL-114, fase 3). Funções puras, testadas em
 * support.test.ts.
 */
import { z } from "zod";

export const SUPPORT_STATUSES = ["open", "answered", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Aberto",
  answered: "Respondido",
  closed: "Fechado",
};

export const SUPPORT_TOPIC_LABELS: Record<string, string> = {
  agenda: "Agenda",
  whatsapp: "WhatsApp",
  pagina: "Página",
  assinatura: "Assinatura",
  outro: "Outro",
};

export const supportUpdateSchema = z
  .object({
    status: z.enum(SUPPORT_STATUSES, { message: "Escolha o status." }),
    admin_reply: z
      .string()
      .trim()
      .max(4000, "A resposta pode ter até 4000 caracteres.")
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.status !== "answered" || v.admin_reply !== null, {
    message: "Escreva a resposta para marcar como respondido.",
    path: ["admin_reply"],
  });

export type SupportUpdateInput = z.infer<typeof supportUpdateSchema>;

export function parseSupportFilter(value: string | undefined): SupportStatus | "all" {
  if (value === "all" || value === "todos") return "all";
  return (SUPPORT_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as SupportStatus)
    : "open";
}

/**
 * WhatsApp mascarado para listas da administração: "5585999997777" → "55 85 9••••-7777".
 * Fixo (8 dígitos depois do DDD) → "55 85 ••••-7777". Outros formatos: só os 4 últimos.
 */
export function maskPhone(raw: string | null | undefined): string {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length < 4) return "••••";
  const last4 = d.slice(-4);
  if (d.startsWith("55") && (d.length === 13 || d.length === 12)) {
    const ddd = d.slice(2, 4);
    const first = d.length === 13 ? d[4] : "";
    return `55 ${ddd} ${first}••••-${last4}`;
  }
  return `••••${last4}`;
}

export const MESSAGE_TYPE_LABELS: Record<string, string> = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
  cancellation: "Cancelamento",
};

export const FAILURE_PERIODS = [7, 30] as const;
export type FailurePeriod = (typeof FAILURE_PERIODS)[number];

export function parseFailurePeriod(value: string | undefined): FailurePeriod {
  return value === "30" ? 30 : 7;
}
