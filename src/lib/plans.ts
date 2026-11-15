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
  /**
   * Mensagens automáticas por mês. null = sem envio automático.
   * Padrão do plano: `businesses.message_limit_override` muda para um negócio (CAL-113).
   */
  monthlyMessages: number | null;
  /** Pro+: "ilimitado" com uso justo (limite configurável). */
  fairUse: boolean;
  features: PlanFeatures;
  /**
   * Pessoas com login no painel, contando o dono. null = ilimitado (CAL-112).
   * Padrão do plano: `businesses.member_limit_override` muda para um negócio (CAL-113).
   */
  maxMembers: number | null;
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
    maxMembers: 3,
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
    maxMembers: 10,
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
    maxMembers: null,
    highlights: [
      "Tudo do Pro",
      "Mensagens ilimitadas (uso justo)",
      "Domínio próprio, relatórios e suporte prioritário",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["basic", "pro", "pro_plus"];

/**
 * Campos do negócio que os helpers usam. Os `*_override` são limites combinados por fora com a
 * Calenvia e gravados no banco (CAL-113); null ou ausente = padrão do plano.
 */
type BusinessPlan = {
  plan: string;
  plan_status: string;
  message_limit_override?: number | null;
  member_limit_override?: number | null;
};

export function planOf(business: Pick<BusinessPlan, "plan">): Plan {
  return PLANS[(business.plan as PlanId) in PLANS ? (business.plan as PlanId) : "basic"];
}

/** Assinatura em situação de uso (pendente conta como uso até o checkout existir). */
export const USABLE_PLAN_STATUSES: PlanStatus[] = ["pending", "active", "past_due"];

export function isPlanUsable(business: Pick<BusinessPlan, "plan_status">): boolean {
  return (USABLE_PLAN_STATUSES as string[]).includes(business.plan_status);
}

/** Planos que enviam mensagens automáticas (para filtrar consultas, ex.: cron de lembretes). */
export function plansWithAutomaticMessages(): PlanId[] {
  return PLAN_ORDER.filter((id) => PLANS[id].features.automaticMessages);
}

/** A página pública aceita agendamentos? */
export function isBookingOpen(business: Pick<BusinessPlan, "plan_status">): boolean {
  return isPlanUsable(business);
}

export function hasFeature(business: BusinessPlan, feature: keyof PlanFeatures): boolean {
  return isPlanUsable(business) && planOf(business).features[feature];
}

/** Envia mensagens automáticas: pelo plano ou por uma cota combinada (ex.: Básico com 200/mês). */
export function canSendAutomaticMessages(business: BusinessPlan): boolean {
  if (!isPlanUsable(business)) return false;
  if (business.message_limit_override != null) return business.message_limit_override > 0;
  return planOf(business).features.automaticMessages;
}

export function canManageByLink(business: BusinessPlan): boolean {
  return hasFeature(business, "manageByLink");
}

/** Cota mensal de mensagens do negócio: a combinada, se houver; senão a do plano (0 = não envia). */
export function monthlyMessageLimit(business: BusinessPlan): number {
  if (business.message_limit_override != null) return business.message_limit_override;
  const plan = planOf(business);
  if (!plan.features.automaticMessages || plan.monthlyMessages === null) return 0;
  return plan.monthlyMessages;
}

/** A cota do negócio foi combinada à parte (não é a do plano)? */
export function hasCustomMessageLimit(business: BusinessPlan): boolean {
  return business.message_limit_override != null;
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

type MemberLimitBusiness = Pick<BusinessPlan, "plan" | "member_limit_override">;

/**
 * Pessoas com login que o negócio pode ter (null = ilimitado): o limite combinado, se houver;
 * senão o do plano. Profissional sem login não conta.
 */
export function maxMembers(business: MemberLimitBusiness): number | null {
  if (business.member_limit_override != null) return business.member_limit_override;
  return planOf(business).maxMembers;
}

/** Ainda cabe mais uma pessoa na equipe? `used` = membros ativos + convites pendentes. */
export function canAddMember(business: MemberLimitBusiness, used: number): boolean {
  const max = maxMembers(business);
  return max === null || used < max;
}
