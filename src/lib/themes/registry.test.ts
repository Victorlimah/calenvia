import { describe, expect, it } from "vitest";
import { getTemplate, TEMPLATES } from "./registry";
import { FONT_PAIRS } from "./font-pairs";
import { findPalette } from "./palettes";

describe("registro de templates (CAL-144)", () => {
  it("Noturno é o primeiro e o padrão; desconhecido cai nele", () => {
    expect(TEMPLATES[0].meta.id).toBe("noturno");
    expect(getTemplate("nao-existe").meta.id).toBe("noturno");
    expect(getTemplate(null).meta.id).toBe("noturno");
  });

  it("ids únicos e metadados válidos (paletas e fontes existem)", () => {
    expect(new Set(TEMPLATES.map((t) => t.meta.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      if (t.meta.paletteId) expect(findPalette(t.meta.paletteId), t.meta.id).not.toBeNull();
      for (const alt of t.meta.altPaletteIds) expect(findPalette(alt), alt).not.toBeNull();
      expect(
        FONT_PAIRS.some((f) => f.id === t.meta.fontPairId),
        t.meta.id,
      ).toBe(true);
      expect(t.meta.segments.length).toBeGreaterThan(0);
    }
  });
});
