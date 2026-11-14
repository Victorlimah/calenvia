import { describe, expect, it } from "vitest";
import {
  formatPhone,
  isValidMobile,
  maskPhoneInput,
  normalizeMobile,
  normalizePhone,
  waMeLink,
} from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["(85) 9 9999-0000", "5585999990000"],
    ["85999990000", "5585999990000"],
    ["+55 85 99999-0000", "5585999990000"],
    ["5585999990000", "5585999990000"],
    ["085999990000", "5585999990000"],
    ["0055 85 99999 0000", "5585999990000"],
    ["(11) 98888-7777", "5511988887777"],
    ["(85) 3222-1111", "558532221111"],
    ["08532221111", "558532221111"],
  ])("%s → %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("acrescenta o 9 em celular no formato antigo", () => {
    expect(normalizePhone("(85) 8888-7777")).toBe("5585988887777");
  });

  it.each(["", "123", "(00) 9 9999-0000", "(20) 9 9999-0000", "(85) 8 9999-0000", "abc", "559"])(
    "rejeita %s",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it("rejeita nulo", () => {
    expect(normalizePhone(null)).toBeNull();
  });
});

describe("celular do cliente final", () => {
  it("aceita só celular", () => {
    expect(normalizeMobile("(85) 9 9999-0000")).toBe("5585999990000");
    expect(normalizeMobile("(85) 3222-1111")).toBeNull();
    expect(isValidMobile("85 99999 0000")).toBe(true);
    expect(isValidMobile("85 3222 1111")).toBe(false);
  });
});

describe("formatação", () => {
  it("formata para exibição", () => {
    expect(formatPhone("5585999990000")).toBe("(85) 9 9999-0000");
    expect(formatPhone("558532221111")).toBe("(85) 3222-1111");
  });
  it("máscara enquanto digita", () => {
    expect(maskPhoneInput("8")).toBe("(8");
    expect(maskPhoneInput("859")).toBe("(85) 9");
    expect(maskPhoneInput("8599999")).toBe("(85) 9 9999");
    expect(maskPhoneInput("85999990000")).toBe("(85) 9 9999-0000");
    expect(maskPhoneInput("859999900001234")).toBe("(85) 9 9999-0000");
  });
  it("link wa.me com texto codificado", () => {
    expect(waMeLink("5585999990000", "Olá, tudo bem?")).toBe(
      "https://wa.me/5585999990000?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });
});
