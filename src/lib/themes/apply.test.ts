import { describe, expect, it } from "vitest";
import { themeFromTemplate } from "./apply";
import { resolveTheme, defaultTheme } from "./resolve";
import { themeSchema } from "./schema";
import { TEMPLATES } from "./registry";
import { AA_TEXT, contrastRatio } from "./color";

describe("aplicar template (CAL-145)", () => {
  it("Noturno sem paleta usa a cor do negócio (igual ao padrão)", () => {
    const t = themeFromTemplate(TEMPLATES[0].meta, { accent: "#F5B014" });
    expect(t).toEqual(defaultTheme("#F5B014"));
  });

  it("todo template × paleta padrão e alternativas gera tema válido e AA sem correção", () => {
    for (const tpl of TEMPLATES) {
      const ids = [tpl.meta.paletteId, ...tpl.meta.altPaletteIds];
      for (const paletteId of ids) {
        for (const mode of ["light", "dark"] as const) {
          const t = themeFromTemplate(tpl.meta, { paletteId, mode, accent: "#F5B014" });
          expect(themeSchema.safeParse(t).success, `${tpl.meta.id}/${paletteId}`).toBe(true);
          const r = resolveTheme(t);
          expect(contrastRatio(r.colors.text, r.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrastRatio(r.colors.primaryFg, r.colors.primary)).toBeGreaterThanOrEqual(
            AA_TEXT,
          );
          expect(contrastRatio(r.colors.link, r.colors.surface)).toBeGreaterThanOrEqual(
            AA_TEXT - 0.5,
          );
        }
      }
    }
  });

  it("mantém seções e opções de logo do dono", () => {
    const base = {
      ...defaultTheme(),
      logo: { show: false, shape: "free" as const, placements: ["footer" as const] },
    };
    base.sections = base.sections.map((s) => (s.id === "faq" ? { ...s, visible: false } : s));
    const t = themeFromTemplate(TEMPLATES[0].meta, { base });
    expect(t.logo.show).toBe(false);
    expect(t.logo.placements).toEqual(["footer"]);
    expect(t.sections.find((s) => s.id === "faq")?.visible).toBe(false);
  });
});
