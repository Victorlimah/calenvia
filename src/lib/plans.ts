/**
 * Planos e limites (CLAUDE.md §1 e §5). Único lugar com regras por plano:
 * a interface usa os helpers abaixo, nunca `if (plan === "pro")`.
 */
export type PlanId = "basic" | "pro" | "pro_plus";
export type PlanStatus = "pending" | "active" | "past_due" | "suspended" | "canceled";

export type PlanFeatures = {
  automaticMessages: boolean;
  manageByLink: boolean; // remarcar/cancelar pelo link
  customDomain: boolean;
  reports: boolean;
  prioritySupport: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  /** Mensagens automáticas por mês. null = sem envio automático. */
  monthlyMessages: number | null;
  /** Pro+: "ilimitado" com uso justo (limite configurável). */
  fairUse: boolean;
  features: PlanFeatures;
  highlights: string[];
};

export const DEFAULT_FAIR_USE_LIMIT = 800;
/** Avisar o dono quando o uso passar desta fração da cota. */
export const QUOTA_WARNING_RATIO = 0.8;

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "Básico",
    priceCents: 2990,
    monthlyMessages: null,
    fairUse: false,
    features: {
      automaticMessages: false,
      manageByLink: false,
      customDomain: false,
      reports: false,
      prioritySupport: false,
    },
    highlights: [
      "Página de agendamento própria",
      "Agenda, bloqueios e clientes",
      "Confirmação pelo WhatsApp com mensagem pronta",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceCents: 4490,
    monthlyMessages: 300,
    fairUse: false,
    features: {
      automaticMessages: true,
      manageByLink: true,
      customDomain: false,
      reports: false,
      prioritySupport: false,
    },
    highlights: [
      "Tudo do Básico",
      "Confirmação e lembrete automáticos (300 mensagens/mês)",
      "Cliente remarca ou cancela pelo link",
    ],
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    priceCents: 7490,
    monthlyMessages: DEFAULT_FAIR_USE_LIMIT,
    fairUse: true,
    features: {
      automaticMessages: true,
      manageByLink: true,
      customDomain: true,
      reports: true,
      prioritySupport: true,
    },
    highlights: [
      "Tudo do Pro",
      "Mensagens ilimitadas (uso justo)",
      "Domínio próprio, relatórios e suporte prioritário",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["basic", "pro", "pro_plus"];

type BusinessPlan = {
  plan: string;
  plan_status: string;
  message_limit_override?: number | null;
};

export function planOf(business: Pick<BusinessPlan, "plan">): Plan {
  return PLANS[(business.plan as PlanId) in PLANS ? (business.plan as PlanId) : "basic"];
}

/** Assinatura em situação de uso (pendente conta como uso até o checkout existir). */
export function isPlanUsable(business: Pick<BusinessPlan, "plan_status">): boolean {
  return ["pending", "active", "past_due"].includes(business.plan_status);
}

/** A página pública aceita agendamentos? */
export function isBookingOpen(business: Pick<BusinessPlan, "plan_status">): boolean {
  return isPlanUsable(business);
}

export function hasFeature(business: BusinessPlan, feature: keyof PlanFeatures): boolean {
  return isPlanUsable(business) && planOf(business).features[feature];
}

export function canSendAutomaticMessages(business: BusinessPlan): boolean {
  return hasFeature(business, "automaticMessages");
}

export function canManageByLink(business: BusinessPlan): boolean {
  return hasFeature(business, "manageByLink");
}

/** Cota mensal de mensagens do negócio (0 se o plano não envia). */
export function monthlyMessageLimit(business: BusinessPlan): number {
  const plan = planOf(business);
  if (!plan.features.automaticMessages || plan.monthlyMessages === null) return 0;
  if (plan.fairUse && business.message_limit_override != null)
    return business.message_limit_override;
  return plan.monthlyMessages;
}

export type QuotaState = {
  limit: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  nearLimit: boolean;
};

export function quotaState(business: BusinessPlan, used: number): QuotaState {
  const limit = monthlyMessageLimit(business);
  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    exhausted: remaining === 0,
    nearLimit: limit > 0 && used >= limit * QUOTA_WARNING_RATIO,
  };
}

/** Pode enviar mais uma mensagem automática agora? */
export function canSendWithQuota(business: BusinessPlan, used: number): boolean {
  return canSendAutomaticMessages(business) && !quotaState(business, used).exhausted;
}

export function formatPlanPrice(plan: Plan): string {
  return `R$ ${(plan.priceCents / 100).toFixed(2).replace(".", ",")}`;
}
