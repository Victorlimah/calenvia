import { describe, expect, it } from "vitest";
import { PLANS, quotaState } from "@/lib/plans";
import { nextPlanWithMoreMessages, quotaNotice, quotaResetLabel } from "./quota";

const biz = (plan: string, override: number | null = null, plan_status = "active") => ({
  plan,
  plan_status,
  message_limit_override: override,
});
const notice = (b: ReturnType<typeof biz>, used: number, period = "2026-11") =>
  quotaNotice(b, quotaState(b, used), period);

describe("cota de mensagens e aviso ao dono (CAL-071)", () => {
  it("a cota recomeça no 1º dia do mês seguinte (dezembro → janeiro)", () => {
    expect(quotaResetLabel("2026-11")).toBe("1º de dezembro");
    expect(quotaResetLabel("2026-12")).toBe("1º de janeiro");
  });

  it("upgrade sugerido: Pro → Pro+; Pro+ não tem para onde ir", () => {
    expect(nextPlanWithMoreMessages(PLANS.pro)?.id).toBe("pro_plus");
    expect(nextPlanWithMoreMessages(PLANS.pro_plus)).toBeNull();
  });

  it("Básico nunca recebe aviso de cota", () => {
    expect(notice(biz("basic"), 0)).toBeNull();
    expect(notice(biz("basic"), 999)).toBeNull();
  });

  it("Pro abaixo de 80% (240 de 300): sem aviso", () => {
    expect(notice(biz("pro"), 239)).toBeNull();
  });

  it("Pro a partir de 80%: aviso com quantas restam e sugestão do Pro+", () => {
    const n = notice(biz("pro"), 240)!;
    expect(n.tone).toBe("info");
    expect(n.title).toBe("Restam 60 mensagens automáticas neste mês");
    expect(n.text).toContain("240 de 300");
    expect(n.text).toContain("1º de dezembro");
    expect(n.upgradeTo?.id).toBe("pro_plus");
  });

  it("Pro com as 300 usadas: aviso de esgotado, agendamentos continuam", () => {
    const n = notice(biz("pro"), 300)!;
    expect(n.tone).toBe("warning");
    expect(n.text).toContain("as 300 mensagens do plano Pro");
    expect(n.text).toContain("agendamentos continuam");
    expect(n.text).toContain("Pro+");
  });

  it("Pro+ usa o uso justo (padrão 800) e sugere o suporte", () => {
    expect(notice(biz("pro_plus"), 639)).toBeNull();
    const near = notice(biz("pro_plus"), 640)!;
    expect(near.title).toBe("Restam 160 mensagens automáticas neste mês");
    const out = notice(biz("pro_plus"), 800)!;
    expect(out.text).toContain("limite de uso justo (800 mensagens)");
    expect(out.upgradeTo).toBeNull();
    expect(out.text).toContain("suporte");
  });

  it("Pro+ com limite configurado por negócio", () => {
    expect(notice(biz("pro_plus", 2000), 1000)).toBeNull();
    expect(notice(biz("pro_plus", 2000), 2000)?.tone).toBe("warning");
  });

  it("assinatura suspensa não mostra aviso de cota", () => {
    expect(notice(biz("pro", null, "suspended"), 300)).toBeNull();
  });
});
