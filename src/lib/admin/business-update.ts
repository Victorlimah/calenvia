/**
 * Alterações que a administração faz num negócio (CAL-114): validação e cálculo do que mudou,
 * para gravar no histórico. Funções puras, testadas em business-update.test.ts.
 */
import { z } from "zod";
import { SUPPORT_STATUS_LABELS, type SupportStatus } from "@/lib/admin/support";
import { viewAsPageLabel } from "@/lib/admin/view-as";
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

/** Rótulos de todos os campos que aparecem no histórico da administração. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  ...ADMIN_FIELD_LABELS,
  status: "Pedido de suporte",
  admin_reply: "Resposta ao suporte",
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
    if (field === "notes" || field === "admin_reply") return "(vazia)";
    return field.endsWith("_override") ? "padrão do plano" : "—";
  }
  if (field === "plan") return PLANS[value as PlanId]?.name ?? String(value);
  if (field === "plan_status") return PLAN_STATUS_LABELS[value as PlanStatus] ?? String(value);
  if (field === "status") return SUPPORT_STATUS_LABELS[value as SupportStatus] ?? String(value);
  if (field === "notes" || field === "admin_reply") {
    const s = String(value);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  }
  return String(value);
}

/**
 * Registros do histórico que não são "campo: antes → depois" ganham um texto próprio.
 * null = mostrar a lista de campos alterados.
 */
export function describeAuditEntry(action: string, changes: unknown): string | null {
  if (action === "view_as") {
    const page = (changes as Changes | null)?.page?.to;
    return `Viu o painel (${viewAsPageLabel(page)})`;
  }
  // Cobrança (CAL-076): o texto pronto fica em changes.detail.to.
  if (action.startsWith("billing.")) {
    const detail = (changes as Changes | null)?.detail?.to;
    return typeof detail === "string" ? detail : null;
  }
  return null;
}
