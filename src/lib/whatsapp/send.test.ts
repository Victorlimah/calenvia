import { describe, expect, it } from "vitest";
import { skipReason } from "./send";

const pro = { plan: "pro", plan_status: "active", message_limit_override: null };
const base = {
  business: pro,
  type: "confirmation" as const,
  appointmentStatus: "confirmed",
  optedOut: false,
  usedThisMonth: 0,
};

describe("skipReason (quando a mensagem automática não sai)", () => {
  it("Pro com cota, cliente aceita e agendamento ativo: envia", () => {
    expect(skipReason(base)).toBeNull();
  });

  it("plano Básico nunca envia", () => {
    expect(skipReason({ ...base, business: { ...pro, plan: "basic" } })).toBe("plan");
  });

  it("assinatura suspensa não envia", () => {
    expect(skipReason({ ...base, business: { ...pro, plan_status: "suspended" } })).toBe("plan");
  });

  it("cliente que pediu para não receber", () => {
    expect(skipReason({ ...base, optedOut: true })).toBe("opted_out");
  });

  it("Pro no limite de 300 no mês cai no plano B", () => {
    expect(skipReason({ ...base, usedThisMonth: 299 })).toBeNull();
    expect(skipReason({ ...base, usedThisMonth: 300 })).toBe("quota");
  });

  it("Pro+ usa o limite de uso justo (padrão 800 ou o configurado)", () => {
    const plus = { ...pro, plan: "pro_plus" };
    expect(skipReason({ ...base, business: plus, usedThisMonth: 799 })).toBeNull();
    expect(skipReason({ ...base, business: plus, usedThisMonth: 800 })).toBe("quota");
    expect(
      skipReason({
        ...base,
        business: { ...plus, message_limit_override: 1000 },
        usedThisMonth: 900,
      }),
    ).toBeNull();
  });

  it("não confirma nem lembra agendamento cancelado", () => {
    expect(skipReason({ ...base, appointmentStatus: "canceled" })).toBe("canceled");
    expect(skipReason({ ...base, type: "reminder", appointmentStatus: "canceled" })).toBe(
      "canceled",
    );
  });

  it("cancelamento só sai para agendamento cancelado", () => {
    expect(skipReason({ ...base, type: "cancellation", appointmentStatus: "canceled" })).toBeNull();
    expect(skipReason({ ...base, type: "cancellation" })).toBe("status");
  });

  it("cancelado vem antes de plano (sem link wa.me para quem cancelou)", () => {
    expect(
      skipReason({ ...base, business: { ...pro, plan: "basic" }, appointmentStatus: "canceled" }),
    ).toBe("canceled");
  });
});
