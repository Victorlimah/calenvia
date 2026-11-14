import { describe, expect, it } from "vitest";
import { formatPrice, parsePriceToCents } from "./money";

describe("dinheiro", () => {
  it("formata em reais", () => {
    expect(formatPrice(4000)).toBe("R$ 40,00");
    expect(formatPrice(123490)).toBe("R$ 1.234,90");
    expect(formatPrice(0)).toBe("R$ 0,00");
  });
  it("lê o preço digitado", () => {
    expect(parsePriceToCents("40")).toBe(4000);
    expect(parsePriceToCents("40,5")).toBe(4050);
    expect(parsePriceToCents("1.234,90")).toBe(123490);
    expect(parsePriceToCents("R$ 35,00")).toBe(3500);
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("")).toBeNull();
  });
});
