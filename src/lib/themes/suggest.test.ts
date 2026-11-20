import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./registry";
import { resolveTheme } from "./resolve";
import { sortTemplatesForSegment, surpriseTheme } from "./suggest";
import { themeSchema } from "./schema";
import { AA_TEXT, contrastRatio } from "./color";

const metas = TEMPLATES.map((t) => t.meta);

describe("sugestão por segmento (CAL-149)", () => {
  it("indicados para o segmento vêm primeiro, sem perder nenhum template", () => {
    const { order, recommended } = sortTemplatesForSegment(metas, "salao");
    expect(recommended).toContain("delicado");
    expect(order.slice(0, recommended.length)).toEqual(recommended);
    expect([...order].sort()).toEqual(metas.map((m) => m.id).sort());
    expect(sortTemplatesForSegment(metas, "clinica").order[0]).toBe("clinico");
    expect(sortTemplatesForSegment(metas, null).order[0]).toBe("noturno");
  });

  it("Surpreenda-me nunca gera tema reprovado em contraste (varre todas as sorteadas)", () => {
    for (let i = 0; i < 200; i++) {
      const r = i / 200;
      const t = surpriseTheme(metas, { segment: i % 2 ? "pet" : null, random: () => r });
      expect(themeSchema.safeParse(t).success).toBe(true);
      const c = resolveTheme(t);
      expect(c.adjustments).toEqual([]);
      expect(contrastRatio(c.colors.text, c.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(c.colors.primaryFg, c.colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it("com segmento, sorteia entre os indicados", () => {
    const t = surpriseTheme(metas, { segment: "clinica", random: () => 0 });
    expect(metas.find((m) => m.id === t.templateId)?.segments).toContain("clinica");
  });
});
