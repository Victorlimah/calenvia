import { describe, expect, it } from "vitest";
import { AA_TEXT, contrastRatio } from "./color";
import {
  choosePreset,
  isModifiedFromPreset,
  paletteFromColor,
  revertToPreset,
  setMode,
  setPrimary,
  setDensity,
  setFontPair,
  setRadius,
  setSecondary,
} from "./edit";
import { FONT_PAIRS, findFontPair, fontPairVars } from "./font-pairs";
import { themeCssVars } from "./resolve";
import { findPalette } from "./palettes";
import { defaultTheme, resolveTheme } from "./resolve";
import { themeSchema } from "./schema";

const lavanda = findPalette("lavanda")!;

describe("editor de cores (CAL-141)", () => {
  it("escolhe paleta pronta e troca claro/escuro mantendo a paleta", () => {
    const t = choosePreset(defaultTheme(), lavanda, "light");
    expect(t.paletteId).toBe("lavanda");
    expect(t.palette).toMatchObject({ mode: "light", ...lavanda.light });
    const dark = setMode(t, "dark");
    expect(dark.palette).toMatchObject({ mode: "dark", ...lavanda.dark });
    expect(themeSchema.safeParse(dark).success).toBe(true);
  });

  it("cor principal: válida aplica, inválida devolve null", () => {
    const t = choosePreset(defaultTheme(), lavanda, "light");
    expect(setPrimary(t, "#d6456a")?.palette.primary).toBe("#D6456A");
    expect(setPrimary(t, "rosa")).toBeNull();
    expect(setPrimary(t, "#12")).toBeNull();
  });

  it("mexer na paleta mostra 'voltar à original', e voltar restaura", () => {
    const t = choosePreset(defaultTheme(), lavanda, "light");
    expect(isModifiedFromPreset(t)).toBe(false);
    const changed = setPrimary(t, "#123456")!;
    expect(isModifiedFromPreset(changed)).toBe(true);
    const back = revertToPreset(changed);
    expect(back.palette.primary).toBe(lavanda.light.primary);
    expect(isModifiedFromPreset(back)).toBe(false);
  });

  it("secundária opcional: vazio remove, inválida recusa", () => {
    const t = choosePreset(defaultTheme(), lavanda, "light");
    expect(setSecondary(t, "")?.palette.secondary).toBeUndefined();
    expect(setSecondary(t, "#ABCDEF")?.palette.secondary).toBe("#ABCDEF");
    expect(setSecondary(t, "xyz")).toBeNull();
  });

  it("paleta própria de qualquer cor sai legível nos dois modos (o sistema corrige)", () => {
    for (const c of ["#F5D90A", "#FFFFFF", "#000000", "#E0457B", "#14B8A6", "#808080"]) {
      for (const mode of ["light", "dark"] as const) {
        const r = resolveTheme({ ...defaultTheme(), palette: paletteFromColor(c, mode) });
        expect(contrastRatio(r.colors.text, r.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(r.colors.primaryFg, r.colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(r.colors.link, r.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(r.colors.sub, r.colors.surface)).toBeGreaterThanOrEqual(AA_TEXT);
      }
    }
  });

  it("amarelo com texto branco no botão é corrigido e avisado", () => {
    const t = setPrimary(choosePreset(defaultTheme(), lavanda, "dark"), "#FFE600")!;
    const r = resolveTheme(t);
    expect(r.colors.primaryFg).toBe("#111111");
    expect(contrastRatio(r.colors.primaryFg, r.colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("fontes e formas (CAL-142)", () => {
  it("6 a 8 pares, ids únicos, padrão é o de hoje", () => {
    expect(FONT_PAIRS.length).toBeGreaterThanOrEqual(6);
    expect(FONT_PAIRS.length).toBeLessThanOrEqual(8);
    expect(new Set(FONT_PAIRS.map((f) => f.id)).size).toBe(FONT_PAIRS.length);
    expect(findFontPair("nao-existe").id).toBe("bricolage-inter");
    expect(fontPairVars(null)["--t-font-display"]).toContain("--font-bricolage");
  });

  it("trocar fonte, cantos e densidade; valores desconhecidos são ignorados", () => {
    const t = defaultTheme();
    expect(setFontPair(t, "elegante").fontPairId).toBe("elegante");
    expect(setFontPair(t, "comic-sans").fontPairId).toBe(t.fontPairId);
    expect(setRadius(t, "round").radius).toBe("round");
    expect(setDensity(t, "compact").density).toBe("compact");
    const vars = themeCssVars(resolveTheme(setFontPair(setRadius(t, "square"), "editorial")));
    expect(vars["--radius-card"]).toBe("4px");
    expect(vars["--t-font-display"]).toContain("--font-dm-serif");
  });

  it("padrão mantém os cantos de antes (20px / 14px)", () => {
    const vars = themeCssVars(resolveTheme(null, "#F5B014"));
    expect(vars["--radius-card"]).toBe("20px");
    expect(vars["--radius-control"]).toBe("14px");
    expect(vars["--density"]).toBe("1");
  });
});

describe("opções do logo (CAL-143)", () => {
  it("formato, mostrar e posições; nunca fica sem lugar", async () => {
    const { setLogoOptions } = await import("./edit");
    const t = defaultTheme();
    expect(setLogoOptions(t, { shape: "free" }).logo.shape).toBe("free");
    expect(setLogoOptions(t, { show: false }).logo.show).toBe(false);
    expect(setLogoOptions(t, { placements: ["header", "footer"] }).logo.placements).toEqual([
      "header",
      "footer",
    ]);
    expect(setLogoOptions(t, { placements: [] }).logo.placements).toEqual(["hero"]);
  });
});

describe("seções (CAL-144)", () => {
  it("esconde, mostra e reordena; abertura e chamada final ficam nas pontas", async () => {
    const { editableSections, moveSection, toggleSection } = await import("./edit");
    const { orderedSections } = await import("./resolve");
    let t = defaultTheme();
    expect(editableSections(t).map((s) => s.id)).toEqual([
      "how",
      "services",
      "gallery",
      "team",
      "testimonials",
      "location",
      "faq",
    ]);
    t = toggleSection(t, "how");
    expect(editableSections(t)[0]).toEqual({ id: "how", visible: false });
    t = moveSection(t, "faq", -1);
    expect(
      editableSections(t)
        .slice(-2)
        .map((s) => s.id),
    ).toEqual(["faq", "location"]);
    expect(moveSection(t, "how", -1)).toBe(t); // já é a primeira
    expect(toggleSection(t, "hero")).toBe(t);
    const ids = orderedSections(t.sections).map((s) => s.id);
    expect(ids[0]).toBe("hero");
    expect(ids.at(-1)).toBe("final");
    expect(themeSchema.safeParse(t).success).toBe(true);
  });
});
