import { describe, expect, it } from "vitest";
import { AA_TEXT, contrastRatio } from "./color";
import {
  choosePreset,
  isModifiedFromPreset,
  paletteFromColor,
  revertToPreset,
  setMode,
  setPrimary,
  setSecondary,
} from "./edit";
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
