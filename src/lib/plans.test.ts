import { describe, expect, it } from "vitest";
import {
  PLANS,
  canAddMember as canAddMemberFn,
  maxMembers as maxMembersFn,
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
  });

  it("cota combinada por negócio vale em qualquer plano (CAL-113)", () => {
    expect(monthlyMessageLimit(biz("pro", "active", 400))).toBe(400);
    expect(canSendAutomaticMessages(biz("pro", "active", 400))).toBe(true);
    // Básico com cota combinada passa a enviar no automático.
    expect(monthlyMessageLimit(biz("basic", "active", 200))).toBe(200);
    expect(canSendAutomaticMessages(biz("basic", "active", 200))).toBe(true);
    // 0 desliga o automático, mesmo no Pro.
    expect(canSendAutomaticMessages(biz("pro", "active", 0))).toBe(false);
    expect(monthlyMessageLimit(biz("pro", "active", 0))).toBe(0);
    // Assinatura parada não envia, nem com cota combinada.
    expect(canSendAutomaticMessages(biz("basic", "suspended", 200))).toBe(false);
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
    // Cadastro sem pagamento não abre a agenda (CAL-076).
    expect(isBookingOpen(biz("basic", "pending"))).toBe(false);
  });

  it("plano desconhecido cai no Básico", () => {
    expect(canSendAutomaticMessages(biz("gold"))).toBe(false);
  });
});

describe("limite de membros (CAL-112/113)", () => {
  it("Básico 3, Pro 10, Pro+ ilimitado", async () => {
    const { canAddMember, maxMembers } = await import("./plans");
    expect(maxMembers({ plan: "basic" })).toBe(3);
    expect(maxMembers({ plan: "pro" })).toBe(10);
    expect(maxMembers({ plan: "pro_plus" })).toBeNull();
    expect(canAddMember({ plan: "basic" }, 2)).toBe(true);
    expect(canAddMember({ plan: "basic" }, 3)).toBe(false);
    expect(canAddMember({ plan: "pro" }, 9)).toBe(true);
    expect(canAddMember({ plan: "pro" }, 10)).toBe(false);
    expect(canAddMember({ plan: "pro_plus" }, 500)).toBe(true);
  });

  it("limite combinado por negócio sobrescreve o do plano", async () => {
    const { canAddMember, maxMembers } = await import("./plans");
    const basic4 = { plan: "basic", member_limit_override: 4 };
    expect(maxMembers(basic4)).toBe(4);
    expect(canAddMember(basic4, 3)).toBe(true);
    expect(canAddMember(basic4, 4)).toBe(false);
    // Também limita o Pro+, que por padrão é ilimitado.
    expect(maxMembers({ plan: "pro_plus", member_limit_override: 20 })).toBe(20);
    expect(maxMembers({ plan: "pro", member_limit_override: null })).toBe(10);
  });
});

describe("extras pagos somam no limite (CAL-115)", () => {
  it("mensagens: padrão do plano + extras", () => {
    expect(monthlyMessageLimit({ ...biz("pro"), addon_messages: 200 })).toBe(500);
    expect(monthlyMessageLimit({ ...biz("pro_plus"), addon_messages: 100 })).toBe(900);
  });

  it("mensagens: override substitui o padrão, extras continuam somando", () => {
    expect(monthlyMessageLimit({ ...biz("pro", "active", 400), addon_messages: 100 })).toBe(500);
    expect(monthlyMessageLimit({ ...biz("pro", "active", 0), addon_messages: 100 })).toBe(100);
  });

  it("Básico com extra de mensagens passa a enviar", () => {
    const b = { ...biz("basic"), addon_messages: 100 };
    expect(monthlyMessageLimit(b)).toBe(100);
    expect(canSendAutomaticMessages(b)).toBe(true);
    expect(canSendAutomaticMessages({ ...biz("basic"), addon_messages: 0 })).toBe(false);
  });

  it("pessoas: padrão ou override + extras; ilimitado continua ilimitado", () => {
    expect(maxMembersFn({ plan: "basic", addon_members: 2 })).toBe(5);
    expect(maxMembersFn({ plan: "basic", member_limit_override: 4, addon_members: 1 })).toBe(5);
    expect(maxMembersFn({ plan: "pro_plus", addon_members: 3 })).toBeNull();
    expect(canAddMemberFn({ plan: "basic", addon_members: 1 }, 3)).toBe(true);
    expect(canAddMemberFn({ plan: "basic", addon_members: 1 }, 4)).toBe(false);
  });
});
