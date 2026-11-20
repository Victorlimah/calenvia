import { describe, expect, it } from "vitest";
import { AA_TEXT, autoTextOn, contrastRatio } from "./color";
import { findPalette, PALETTES, presetPalette } from "./palettes";
import { defaultTheme, resolveTheme } from "./resolve";
import { paletteSchema } from "./schema";

describe("paletas prontas (CAL-141)", () => {
  it("são pelo menos 16, com ids únicos e nome em português", () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(16);
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
    expect(findPalette("lavanda")?.name).toBe("Lavanda suave");
    expect(findPalette("nao-existe")).toBeNull();
  });

  it("não é só preto e dourado: maioria clara e colorida", () => {
    const warmOrColorful = PALETTES.filter(
      (p) => !["grafite-dourado", "preto-vermelho"].includes(p.id),
    );
    expect(warmOrColorful.length).toBeGreaterThanOrEqual(14);
  });

  for (const p of PALETTES) {
    for (const mode of ["light", "dark"] as const) {
      it(`${p.name} (${mode === "light" ? "claro" : "escuro"}) passa AA sem correção`, () => {
        const c = p[mode];
        expect(paletteSchema.safeParse({ mode, ...c }).success).toBe(true);
        for (const bg of [c.background, c.surface]) {
          expect(contrastRatio(c.text, bg), "texto").toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrastRatio(c.muted!, bg), "texto secundário").toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrastRatio(c.primary, bg), "link").toBeGreaterThanOrEqual(AA_TEXT);
        }
        expect(contrastRatio(autoTextOn(c.primary), c.primary), "botão").toBeGreaterThanOrEqual(
          AA_TEXT,
        );
        const r = resolveTheme({ ...defaultTheme(), palette: presetPalette(p, mode) });
        expect(r.adjustments).toEqual([]);
        expect(r.colors.primary).toBe(c.primary);
      });
    }
  }
});
