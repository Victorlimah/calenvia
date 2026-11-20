import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color";
import { themeFromTemplate } from "./apply";
import { qrColor, QR_FALLBACK } from "./qr";
import { resolveTheme } from "./resolve";
import { TEMPLATES } from "./registry";

describe("cor do QR code (CAL-150)", () => {
  it("sempre bem escura sobre branco, em todo template", () => {
    for (const t of TEMPLATES) {
      for (const mode of ["light", "dark"] as const) {
        const c = qrColor(resolveTheme(themeFromTemplate(t.meta, { mode, accent: "#F5B014" })));
        expect(contrastRatio(c, "#FFFFFF")).toBeGreaterThanOrEqual(7);
      }
    }
  });
  it("usa a cor principal quando dá (vinho), senão cai na tinta", () => {
    const vinho = TEMPLATES.find((t) => t.meta.id === "boutique")!.meta;
    expect(qrColor(resolveTheme(themeFromTemplate(vinho)))).toBe("#7A1F3D");
    const noturno = resolveTheme(themeFromTemplate(TEMPLATES[0].meta, { accent: "#F5B014" }));
    expect(qrColor(noturno)).toBe(QR_FALLBACK);
  });
});
