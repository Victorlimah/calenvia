/**
 * Alterações que a administração faz num negócio (CAL-114): validação e cálculo do que mudou,
 * para gravar no histórico. Funções puras, testadas em business-update.test.ts.
 */
import { z } from "zod";
import { PLAN_ORDER, PLANS, type PlanId, type PlanStatus } from "@/lib/plans";

export const PLAN_STATUSES: PlanStatus[] = [
  "pending",
  "active",
  "past_due",
  "suspended",
  "canceled",
];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  pending: "Aguardando pagamento",
  active: "Ativa",
  past_due: "Pagamento atrasado",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

/** Campo vazio = padrão do plano (null). */
const optionalLimit = (min: number, label: string) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z
      .number({ message: `${label}: use um número inteiro.` })
      .int(`${label}: use um número inteiro.`)
      .min(min, `${label}: o mínimo é ${min}.`)
      .max(100000, `${label}: o máximo é 100000.`)
      .nullable(),
  );

export const adminBusinessSchema = z.object({
  plan: z.enum(PLAN_ORDER as [PlanId, ...PlanId[]], { message: "Escolha um plano." }),
  plan_status: z.enum(PLAN_STATUSES as [PlanStatus, ...PlanStatus[]], {
    message: "Escolha o status da assinatura.",
  }),
  member_limit_override: optionalLimit(1, "Limite de pessoas"),
  message_limit_override: optionalLimit(0, "Cota de mensagens"),
  notes: z.string().trim().max(4000, "A observação pode ter até 4000 caracteres."),
});

export type AdminBusinessInput = z.infer<typeof adminBusinessSchema>;
export type AdminBusinessFields = Omit<AdminBusinessInput, "notes">;

export const ADMIN_FIELD_LABELS: Record<keyof AdminBusinessInput, string> = {
  plan: "Plano",
  plan_status: "Status da assinatura",
  member_limit_override: "Limite de pessoas",
  message_limit_override: "Cota de mensagens",
  notes: "Observação interna",
};

export type Changes = Record<string, { from: unknown; to: unknown }>;

/** Só os campos que mudaram, no formato do histórico: { campo: { from, to } }. */
export function diffChanges<T extends Record<string, unknown>>(before: T, after: T): Changes {
  const out: Changes = {};
  for (const key of Object.keys(after)) {
    const from = before[key] ?? null;
    const to = after[key] ?? null;
    if (from !== to) out[key] = { from, to };
  }
  return out;
}

/** Valor do histórico em texto para a tela ("padrão do plano" quando null). */
export function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    if (field === "notes") return "(vazia)";
    return field.endsWith("_override") ? "padrão do plano" : "—";
  }
  if (field === "plan") return PLANS[value as PlanId]?.name ?? String(value);
  if (field === "plan_status") return PLAN_STATUS_LABELS[value as PlanStatus] ?? String(value);
  if (field === "notes") {
    const s = String(value);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }
  return String(value);
}
