import { describe, expect, it } from "vitest";
import { ACCENT_PRESETS, contrastRatio, isHexColor, readableTextOn } from "./color";

describe("cores", () => {
  it("valida hex", () => {
    expect(isHexColor("#F5B014")).toBe(true);
    expect(isHexColor("F5B014")).toBe(false);
    expect(isHexColor("#FFF")).toBe(false);
  });
  it("texto escuro em cor clara e claro em cor escura", () => {
    expect(readableTextOn("#F5B014")).toBe("#111111");
    expect(readableTextOn("#4B3FD9")).toBe("#FFFFFF");
    expect(readableTextOn("#FFFFFF")).toBe("#111111");
    expect(readableTextOn("#000000")).toBe("#FFFFFF");
  });
  it("toda cor sugerida tem texto com contraste AA para botão grande (≥ 3)", () => {
    for (const c of ACCENT_PRESETS) {
      expect(contrastRatio(c, readableTextOn(c))).toBeGreaterThanOrEqual(3);
    }
  });
});
