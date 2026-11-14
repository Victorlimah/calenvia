import { describe, expect, it } from "vitest";
import { buildFaq, noticeText } from "./faq";

const base = {
  name: "Barbearia do Zé",
  plan: "pro",
  plan_status: "active",
  min_notice_min: 60,
  max_days_ahead: 30,
  cancel_notice_min: 120,
  address: "Rua A, 1",
};

describe("dúvidas da página", () => {
  it("texto de antecedência", () => {
    expect(noticeText(0)).toBe("sem antecedência mínima");
    expect(noticeText(30)).toBe("30 minutos");
    expect(noticeText(60)).toBe("1 hora");
    expect(noticeText(240)).toBe("4 horas");
    expect(noticeText(1440)).toBe("1 dia");
    expect(noticeText(2880)).toBe("2 dias");
  });
  it("Pro fala de confirmação automática e link", () => {
    const faq = buildFaq(base);
    expect(faq.find((f) => f.q.startsWith("Como recebo"))!.a).toMatch(/lembrete/);
    expect(faq.find((f) => f.q.startsWith("E se"))!.a).toMatch(/2 horas antes/);
    expect(faq.at(-1)!.a).toBe("Rua A, 1");
  });
  it("Básico fala em confirmar pelo WhatsApp", () => {
    const faq = buildFaq({ ...base, plan: "basic", address: null });
    expect(faq.find((f) => f.q.startsWith("Como recebo"))!.a).toMatch(/confirma seu horário/);
    expect(faq.find((f) => f.q.startsWith("E se"))!.a).toMatch(/Fale com/);
    expect(faq.some((f) => f.q === "Onde fica?")).toBe(false);
  });
});
