/**
 * Contas das métricas da administração (CAL-114, fase 2). Funções puras, testadas em
 * metrics.test.ts.
 */
import { PLAN_ORDER, PLANS, type PlanId } from "@/lib/plans";

/** { plano: { status: quantidade } }, como vem de admin_metrics_overview(). */
export type CountsByPlanStatus = Partial<Record<string, Partial<Record<string, number>>>>;

export type MrrEstimate = {
  /** Soma do preço de tabela dos negócios com assinatura ativa. */
  activeCents: number;
  activeBusinesses: number;
  /** Mesma conta para quem está com pagamento atrasado (receita em risco). */
  atRiskCents: number;
  atRiskBusinesses: number;
};

/** Receita mensal estimada pelo preço de tabela (não considera valores combinados por fora). */
export function estimatedMrrCents(counts: CountsByPlanStatus): MrrEstimate {
  const out: MrrEstimate = {
    activeCents: 0,
    activeBusinesses: 0,
    atRiskCents: 0,
    atRiskBusinesses: 0,
  };
  for (const plan of PLAN_ORDER) {
    const price = PLANS[plan].priceCents;
    const active = toCount(counts[plan]?.active);
    const atRisk = toCount(counts[plan]?.past_due);
    out.activeCents += price * active;
    out.activeBusinesses += active;
    out.atRiskCents += price * atRisk;
    out.atRiskBusinesses += atRisk;
  }
  return out;
}

export type FunnelStep = { step: string; total: number };
export type FunnelRate = FunnelStep & {
  /** Fração em relação ao passo anterior (null no primeiro passo ou se o anterior é 0). */
  fromPrevious: number | null;
  /** Fração em relação ao primeiro passo (null se o primeiro é 0). */
  fromFirst: number | null;
};

/** Taxa de cada passo do funil sobre o anterior e sobre o primeiro, sem dividir por zero. */
export function funnelRates(steps: FunnelStep[]): FunnelRate[] {
  const first = steps[0]?.total ?? 0;
  return steps.map((s, i) => {
    const prev = i === 0 ? null : steps[i - 1]!.total;
    return {
      ...s,
      fromPrevious: prev === null || prev === 0 ? null : s.total / prev,
      fromFirst: first === 0 ? null : s.total / first,
    };
  });
}

/** "42%" (ou "—" quando não dá para calcular). */
export function formatRate(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

export const FUNNEL_LABELS: Record<string, string> = {
  site_visit: "Visitas ao site",
  signup: "Contas criadas",
  business_created: "Negócios criados",
  first_service: "Primeiro serviço",
  onboarding_completed: "Onboarding concluído",
  first_appointment: "Primeiro agendamento",
  subscription_started: "Assinatura paga",
};

export const FUNNEL_PERIODS = [7, 30, 90] as const;
export type FunnelPeriod = (typeof FUNNEL_PERIODS)[number];

export function parseFunnelPeriod(value: string | undefined): FunnelPeriod {
  const n = Number(value);
  return (FUNNEL_PERIODS as readonly number[]).includes(n) ? (n as FunnelPeriod) : 30;
}

/** Soma dos negócios de um plano (todos os status). */
export function planTotal(counts: CountsByPlanStatus, plan: PlanId): number {
  return Object.values(counts[plan] ?? {}).reduce<number>((sum, n) => sum + toCount(n), 0);
}

function toCount(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
