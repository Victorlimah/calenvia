import { describe, expect, it } from "vitest";
import { maskPhone, parseFailurePeriod, parseSupportFilter, supportUpdateSchema } from "./support";

describe("supportUpdateSchema (CAL-114)", () => {
  it("resposta vazia vira null e fechar sem resposta pode", () => {
    expect(supportUpdateSchema.parse({ status: "closed", admin_reply: "  " })).toEqual({
      status: "closed",
      admin_reply: null,
    });
  });

  it("respondido exige resposta", () => {
    const r = supportUpdateSchema.safeParse({ status: "answered", admin_reply: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["admin_reply"]);
    expect(
      supportUpdateSchema.parse({ status: "answered", admin_reply: " Resolvido! " }).admin_reply,
    ).toBe("Resolvido!");
  });

  it("recusa status desconhecido e resposta longa demais", () => {
    expect(supportUpdateSchema.safeParse({ status: "x", admin_reply: "" }).success).toBe(false);
    expect(
      supportUpdateSchema.safeParse({ status: "answered", admin_reply: "a".repeat(4001) }).success,
    ).toBe(false);
  });
});

describe("maskPhone", () => {
  it("celular brasileiro", () => {
    expect(maskPhone("5585999997777")).toBe("55 85 9••••-7777");
  });
  it("fixo brasileiro", () => {
    expect(maskPhone("558533337777")).toBe("55 85 ••••-7777");
  });
  it("outros formatos mostram só o final", () => {
    expect(maskPhone("+1 (555) 123-4567")).toBe("••••4567");
    expect(maskPhone("12")).toBe("••••");
    expect(maskPhone(null)).toBe("••••");
  });
});

describe("filtros", () => {
  it("suporte: padrão abertos; aceita os status e 'todos'", () => {
    expect(parseSupportFilter(undefined)).toBe("open");
    expect(parseSupportFilter("answered")).toBe("answered");
    expect(parseSupportFilter("todos")).toBe("all");
    expect(parseSupportFilter("x")).toBe("open");
  });
  it("falhas: 7 ou 30 dias", () => {
    expect(parseFailurePeriod("30")).toBe(30);
    expect(parseFailurePeriod("90")).toBe(7);
  });
});
