import { describe, expect, it } from "vitest";
import {
  PLANS,
  canManageByLink,
  canSendAutomaticMessages,
  canSendWithQuota,
  formatPlanPrice,
  isBookingOpen,
  monthlyMessageLimit,
  quotaState,
} from "./plans";

const biz = (
  plan: string,
  plan_status = "active",
  message_limit_override: number | null = null,
) => ({
  plan,
  plan_status,
  message_limit_override,
});

describe("planos", () => {
  it("preços", () => {
    expect(formatPlanPrice(PLANS.basic)).toBe("R$ 29,90");
    expect(formatPlanPrice(PLANS.pro)).toBe("R$ 44,90");
    expect(formatPlanPrice(PLANS.pro_plus)).toBe("R$ 74,90");
  });

  it("Básico não envia mensagens automáticas nem tem link de gerenciar", () => {
    expect(canSendAutomaticMessages(biz("basic"))).toBe(false);
    expect(canManageByLink(biz("basic"))).toBe(false);
    expect(monthlyMessageLimit(biz("basic"))).toBe(0);
  });

  it("Pro tem 300 mensagens", () => {
    expect(canSendAutomaticMessages(biz("pro"))).toBe(true);
    expect(monthlyMessageLimit(biz("pro"))).toBe(300);
  });

  it("Pro+ usa o limite de uso justo, configurável", () => {
    expect(monthlyMessageLimit(biz("pro_plus"))).toBe(800);
    expect(monthlyMessageLimit(biz("pro_plus", "active", 1500))).toBe(1500);
    expect(monthlyMessageLimit(biz("pro", "active", 1500))).toBe(300); // override só no Pro+
  });

  it("cota: aviso perto do limite e esgotada", () => {
    expect(quotaState(biz("pro"), 100)).toMatchObject({
      remaining: 200,
      nearLimit: false,
      exhausted: false,
    });
    expect(quotaState(biz("pro"), 240).nearLimit).toBe(true);
    expect(quotaState(biz("pro"), 300).exhausted).toBe(true);
    expect(canSendWithQuota(biz("pro"), 299)).toBe(true);
    expect(canSendWithQuota(biz("pro"), 300)).toBe(false);
  });

  it("assinatura suspensa ou cancelada desliga recursos e a agenda", () => {
    expect(canSendAutomaticMessages(biz("pro", "suspended"))).toBe(false);
    expect(isBookingOpen(biz("pro", "canceled"))).toBe(false);
    expect(isBookingOpen(biz("pro", "past_due"))).toBe(true);
    expect(isBookingOpen(biz("basic", "pending"))).toBe(true);
  });

  it("plano desconhecido cai no Básico", () => {
    expect(canSendAutomaticMessages(biz("gold"))).toBe(false);
  });
});
