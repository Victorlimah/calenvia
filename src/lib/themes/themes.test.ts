import { describe, expect, it } from "vitest";
import {
  AA_TEXT,
  autoTextOn,
  contrastRatio,
  deriveTones,
  ensureButton,
  ensureContrast,
  ensureContrastAll,
  INK,
  mix,
  normalizeHex,
  WHITE,
} from "./color";
import {
  defaultTheme,
  NOTURNO_PALETTE,
  orderedSections,
  parseTheme,
  resolveTheme,
  themeCssVars,
} from "./resolve";
import { themeSchema } from "./schema";

describe("cores (CAL-140)", () => {
  it("normaliza hexadecimal e recusa cor inválida", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("4b3fd9")).toBe("#4B3FD9");
    expect(normalizeHex(" #4B3FD9 ")).toBe("#4B3FD9");
    expect(normalizeHex("vermelho")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("")).toBeNull();
  });

  it("razão de contraste WCAG", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("branco sobre amarelo reprova e o sistema corrige para tinta", () => {
    const yellow = "#F5D90A";
    expect(contrastRatio(WHITE, yellow)).toBeLessThan(AA_TEXT);
    expect(autoTextOn(yellow)).toBe(INK);
    const b = ensureButton(yellow);
    expect(b.fg).toBe(INK);
    expect(contrastRatio(b.fg, b.color)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("botão de meio-tom é escurecido ou clareado até o texto passar", () => {
    for (const c of ["#E0457B", "#2F80ED", "#1F9D55", "#14B8A6", "#F2994A", "#888888"]) {
      const b = ensureButton(c);
      expect(contrastRatio(b.fg, b.color), c).toBeGreaterThanOrEqual(AA_TEXT);
    }
    // Cor que já funciona fica igual.
    expect(ensureButton("#4B3FD9").color).toBe("#4B3FD9");
  });

  it("ajuste para AA mantém o tom e passa", () => {
    const fixed = ensureContrast("#F5B014", "#FFFFFF", AA_TEXT);
    expect(contrastRatio(fixed, "#FFFFFF")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(fixed).not.toBe("#000000");
    expect(ensureContrast("#111111", "#FFFFFF")).toBe("#111111");
    const both = ensureContrastAll("#999999", ["#FFFFFF", "#F3F1EC"]);
    expect(contrastRatio(both, "#FFFFFF")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(both, "#F3F1EC")).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("mistura e tons derivados", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    const t = deriveTones({
      primary: "#D6456A",
      background: "#FFF7F5",
      surface: "#FFFFFF",
      text: "#3A1F29",
    });
    expect(contrastRatio(t.sub, "#FFF7F5")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(t.sub, "#FFFFFF")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(t.link, "#FFF7F5")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(t.primaryHover).not.toBe("#D6456A");
  });
});

describe("tema (CAL-140)", () => {
  it("negócio sem tema cai no padrão Noturno com a cor dele", () => {
    const t = parseTheme(null, "#E8B04A");
    expect(t.templateId).toBe("noturno");
    expect(t.palette).toEqual({ ...NOTURNO_PALETTE, primary: "#E8B04A" });
    expect(parseTheme(undefined, null).palette.primary).toBe("#4B3FD9");
  });

  it("tema inválido ou de outra versão cai no padrão sem quebrar", () => {
    expect(parseTheme({ version: 2 }, "#E8B04A").templateId).toBe("noturno");
    expect(parseTheme("lixo", "#E8B04A").templateId).toBe("noturno");
    const bad = { ...defaultTheme(), palette: { ...defaultTheme().palette, primary: "azul" } };
    expect(themeSchema.safeParse(bad).success).toBe(false);
    expect(parseTheme(bad, "#E8B04A").palette.primary).toBe("#E8B04A");
  });

  it("tema válido é lido como está", () => {
    const t = {
      ...defaultTheme(),
      templateId: "delicado",
      palette: {
        mode: "light",
        primary: "#d6456a",
        background: "#FFF7F5",
        surface: "#FFFFFF",
        text: "#3A1F29",
      },
    };
    const parsed = parseTheme(t);
    expect(parsed.templateId).toBe("delicado");
    expect(parsed.palette.primary).toBe("#D6456A");
  });

  it("seção repetida é recusada", () => {
    const t = defaultTheme();
    t.sections = [...t.sections, { id: "faq", visible: false, order: 99 }];
    expect(themeSchema.safeParse(t).success).toBe(false);
  });

  it("padrão resolve para as cores atuais da página (sem regressão)", () => {
    const r = resolveTheme(null, "#E8B04A");
    expect(r.colors.bg).toBe("#0F0F0F");
    expect(r.colors.surface).toBe("#1A1A1A");
    expect(r.colors.text).toBe("#F5F2EA");
    expect(r.colors.primary).toBe("#E8B04A");
    expect(r.colors.primaryFg).toBe(INK);
    expect(r.adjustments).toEqual([]);
    const vars = themeCssVars(r);
    expect(vars["--accent"]).toBe("#E8B04A");
    expect(vars["--c-bg"]).toBe("#0F0F0F");
  });

  it("texto ilegível é corrigido e avisado", () => {
    const r = resolveTheme({
      ...defaultTheme(),
      palette: {
        mode: "light",
        primary: "#F5D90A",
        background: "#FFFFFF",
        surface: "#FAFAFA",
        text: "#DDDDDD",
      },
    });
    expect(contrastRatio(r.colors.text, "#FFFFFF")).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(r.colors.primaryFg, r.colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(r.adjustments).toContain("Ajustamos a cor do texto para ficar legível.");
  });

  it("ordem das seções: abertura e chamada final nas pontas", () => {
    const t = defaultTheme();
    const custom = t.sections.map((s) =>
      s.id === "faq" ? { ...s, order: 0 } : s.id === "how" ? { ...s, visible: false } : s,
    );
    const ids = orderedSections(custom).map((s) => s.id);
    expect(ids[0]).toBe("hero");
    expect(ids[1]).toBe("faq");
    expect(ids.at(-1)).toBe("final");
    expect(orderedSections(custom).find((s) => s.id === "how")?.visible).toBe(false);
    // Lista vazia (tema antigo) → todas, na ordem padrão.
    expect(orderedSections([]).map((s) => s.id)).toEqual([
      "hero",
      "how",
      "services",
      "gallery",
      "team",
      "testimonials",
      "location",
      "faq",
      "final",
    ]);
  });
});
