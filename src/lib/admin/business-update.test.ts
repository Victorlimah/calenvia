import { describe, expect, it } from "vitest";
import { adminBusinessSchema, diffChanges, formatChangeValue } from "./business-update";

const base = {
  plan: "basic",
  plan_status: "active",
  member_limit_override: "",
  message_limit_override: "",
  notes: "",
};

describe("adminBusinessSchema (CAL-114)", () => {
  it("campo de limite vazio vira null (padrão do plano)", () => {
    const r = adminBusinessSchema.parse(base);
    expect(r.member_limit_override).toBeNull();
    expect(r.message_limit_override).toBeNull();
  });

  it("aceita limites combinados", () => {
    const r = adminBusinessSchema.parse({
      ...base,
      member_limit_override: "4",
      message_limit_override: "0",
    });
    expect(r.member_limit_override).toBe(4);
    expect(r.message_limit_override).toBe(0);
  });

  it("recusa limite de pessoas 0, número quebrado e texto", () => {
    expect(adminBusinessSchema.safeParse({ ...base, member_limit_override: "0" }).success).toBe(
      false,
    );
    expect(adminBusinessSchema.safeParse({ ...base, message_limit_override: "1.5" }).success).toBe(
      false,
    );
    expect(adminBusinessSchema.safeParse({ ...base, message_limit_override: "abc" }).success).toBe(
      false,
    );
  });

  it("recusa plano e status desconhecidos", () => {
    expect(adminBusinessSchema.safeParse({ ...base, plan: "gold" }).success).toBe(false);
    expect(adminBusinessSchema.safeParse({ ...base, plan_status: "x" }).success).toBe(false);
  });
});

describe("diffChanges", () => {
  it("só devolve o que mudou, tratando undefined como null", () => {
    expect(
      diffChanges(
        { plan: "basic", member_limit_override: null, message_limit_override: 300 },
        { plan: "basic", member_limit_override: 4, message_limit_override: 300 },
      ),
    ).toEqual({ member_limit_override: { from: null, to: 4 } });
    expect(diffChanges({ a: undefined }, { a: null })).toEqual({});
  });
});

describe("formatChangeValue", () => {
  it("null em limite é o padrão do plano; status em português", () => {
    expect(formatChangeValue("member_limit_override", null)).toBe("padrão do plano");
    expect(formatChangeValue("plan_status", "suspended")).toBe("Suspensa");
    expect(formatChangeValue("notes", "")).toBe("(vazia)");
    expect(formatChangeValue("notes", "x".repeat(100))).toHaveLength(81);
  });
});
