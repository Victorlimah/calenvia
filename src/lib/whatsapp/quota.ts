/**
 * Cota mensal de mensagens automáticas (CAL-071): leitura do uso do mês e aviso ao dono.
 * Regras de limite ficam em src/lib/plans.ts (300 no Pro, uso justo no Pro+).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { periodOf } from "@/lib/dates";
import {
  canSendAutomaticMessages,
  hasCustomMessageLimit,
  PLAN_ORDER,
  PLANS,
  planOf,
  quotaState,
  type Plan,
  type QuotaState,
} from "@/lib/plans";
import type { Database } from "@/lib/supabase/types";

type BusinessPlan = {
  id: string;
  timezone: string;
  plan: string;
  plan_status: string;
  message_limit_override: number | null;
  addon_messages?: number | null;
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** "1º de dezembro" — dia em que a cota do período (YYYY-MM) recomeça. */
export function quotaResetLabel(period: string): string {
  const month = Number(period.slice(5, 7)); // 1–12; o índice seguinte é o próximo mês
  return `1º de ${MONTHS[month % 12]}`;
}

/** Próximo plano com mais mensagens que `limit` (padrão: a cota do próprio plano). */
export function nextPlanWithMoreMessages(
  plan: Plan,
  limit: number = plan.monthlyMessages ?? 0,
): Plan | null {
  const idx = PLAN_ORDER.indexOf(plan.id);
  for (const id of PLAN_ORDER.slice(idx + 1)) {
    const p = PLANS[id];
    if ((p.monthlyMessages ?? 0) > limit) return p;
  }
  return null;
}

export type QuotaNotice = {
  tone: "info" | "warning";
  title: string;
  text: string;
  /** Plano sugerido para upgrade (null = falar com o suporte). */
  upgradeTo: Plan | null;
};

/** Aviso ao dono quando a cota está perto do fim ou acabou. null = nada a avisar. */
export function quotaNotice(
  business: Pick<
    BusinessPlan,
    "plan" | "plan_status" | "message_limit_override" | "addon_messages"
  >,
  state: QuotaState,
  period: string,
): QuotaNotice | null {
  if (!canSendAutomaticMessages(business) || state.limit === 0) return null;
  const plan = planOf(business);
  const upgradeTo = nextPlanWithMoreMessages(plan, state.limit);
  const reset = quotaResetLabel(period);
  const limitLabel = hasCustomMessageLimit(business)
    ? `as ${state.limit} mensagens combinadas para o seu negócio`
    : plan.fairUse
      ? `o limite de uso justo (${state.limit} mensagens)`
      : `as ${state.limit} mensagens do plano ${plan.name}`;
  const next = upgradeTo
    ? ` Mude para o ${upgradeTo.name} para continuar no automático.`
    : " Fale com o suporte se precisar de mais.";

  if (state.exhausted) {
    return {
      tone: "warning",
      title: "As mensagens automáticas do mês acabaram",
      text:
        `Você usou ${limitLabel}. Os agendamentos continuam normalmente, mas até ${reset} ` +
        `a confirmação e o lembrete ficam pelo botão “Enviar no WhatsApp” de cada agendamento.` +
        next,
      upgradeTo,
    };
  }
  if (state.nearLimit) {
    return {
      tone: "info",
      title: `Restam ${state.remaining} mensagens automáticas neste mês`,
      text:
        `Você já usou ${state.used} de ${state.limit}. Quando acabar, a confirmação passa a ser ` +
        `pelo seu WhatsApp até ${reset}.` +
        next,
      upgradeTo,
    };
  }
  return null;
}

export type MonthQuota = { period: string; state: QuotaState; notice: QuotaNotice | null };

/** Uso do mês no fuso do negócio. Funciona com o client do dono (RLS: só lê o próprio). */
export async function getMonthQuota(
  db: SupabaseClient<Database>,
  business: BusinessPlan,
  now: Date = new Date(),
): Promise<MonthQuota> {
  const period = periodOf(now, business.timezone);
  const { data } = await db
    .from("message_usage")
    .select("count")
    .eq("business_id", business.id)
    .eq("period", period)
    .maybeSingle();
  const state = quotaState(business, data?.count ?? 0);
  return { period, state, notice: quotaNotice(business, state, period) };
}
