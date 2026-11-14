import { describe, expect, it } from "vitest";
import { newRefCode, normalizeRefCode, referralShareText } from "./referrals";

describe("indicação", () => {
  it("normaliza e valida o código", () => {
    expect(normalizeRefCode(" AbC23456 ")).toBe("abc23456");
    expect(normalizeRefCode("x")).toBeNull();
    expect(normalizeRefCode("abc-123456")).toBeNull();
    expect(normalizeRefCode(null)).toBeNull();
  });

  it("gera código de 8 caracteres sem letras ambíguas", () => {
    const c = newRefCode();
    expect(c).toMatch(/^[a-z2-9]{8}$/);
    expect(c).not.toMatch(/[01lo]/);
  });

  it("texto para compartilhar", () => {
    expect(referralShareText("Barbearia do Zé", "https://x")).toContain("na Barbearia do Zé");
  });
});
