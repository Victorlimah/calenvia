/**
 * Do tema guardado (ou da falta dele) aos tokens da página (CAL-140). Puro e testado:
 * tema inválido/antigo cai no padrão "Noturno", e as cores saem sempre com contraste AA.
 */
import {
  AA_LARGE,
  AA_TEXT,
  deriveTones,
  ensureButton,
  ensureContrast,
  ensureContrastAll,
  normalizeHex,
} from "./color";
import {
  FIXED_SECTIONS,
  SECTION_IDS,
  themeSchema,
  type RadiusId,
  type SectionId,
  type SectionSetting,
  type Theme,
} from "./schema";

/** Cor padrão da marca Calenvia (quando o negócio não tem cor). */
export const DEFAULT_ACCENT = "#4B3FD9";

/** Visual de antes dos temas: escuro, ousado, com a cor de destaque do negócio. */
export const NOTURNO_PALETTE = {
  mode: "dark" as const,
  background: "#0F0F0F",
  surface: "#1A1A1A",
  text: "#F5F2EA",
  muted: "#C9C4B9",
};

export const DEFAULT_FONT_PAIR = "bricolage-inter";

export function defaultSections(): SectionSetting[] {
  return SECTION_IDS.map((id, order) => ({ id, visible: true, order }));
}

/** Tema padrão (Noturno) com a cor de destaque do negócio. */
export function defaultTheme(accent?: string | null): Theme {
  return {
    version: 1,
    templateId: "noturno",
    palette: { ...NOTURNO_PALETTE, primary: normalizeHex(accent) ?? DEFAULT_ACCENT },
    fontPairId: DEFAULT_FONT_PAIR,
    radius: "soft",
    density: "comfortable",
    logo: { show: true, shape: "round" },
    sections: defaultSections(),
  };
}

/** Lê o JSON do banco: válido → tema; vazio, inválido ou de outra versão → padrão. */
export function parseTheme(raw: unknown, accent?: string | null): Theme {
  if (raw === null || raw === undefined) return defaultTheme(accent);
  const parsed = themeSchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultTheme(accent);
}

/** Seções na ordem final: fixas nas pontas, as demais pela ordem do dono, faltantes no fim. */
export function orderedSections(sections: SectionSetting[]): { id: SectionId; visible: boolean }[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const middle = SECTION_IDS.filter((id) => !FIXED_SECTIONS.includes(id))
    .map((id, i) => byId.get(id) ?? { id, visible: true, order: 100 + i })
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, visible: s.visible }));
  return [{ id: "hero", visible: true }, ...middle, { id: "final", visible: true }];
}

const RADIUS: Record<RadiusId, { card: string; control: string }> = {
  square: { card: "4px", control: "4px" },
  soft: { card: "16px", control: "12px" },
  round: { card: "28px", control: "999px" },
};

export type ResolvedTheme = {
  theme: Theme;
  colors: {
    primary: string;
    primaryFg: string;
    primaryHover: string;
    primarySoft: string;
    secondary: string;
    bg: string;
    surface: string;
    surface2: string;
    text: string;
    sub: string;
    border: string;
    link: string;
  };
  /** Avisos em português quando o sistema corrigiu uma cor (para o editor mostrar). */
  adjustments: string[];
};

/** Tema → cores finais com AA garantido + avisos do que foi ajustado. */
export function resolveTheme(raw: unknown, accent?: string | null): ResolvedTheme {
  const theme = parseTheme(raw, accent);
  const p = theme.palette;
  const adjustments: string[] = [];

  const text = ensureContrastAll(p.text, [p.background, p.surface], AA_TEXT);
  if (text !== p.text) adjustments.push("Ajustamos a cor do texto para ficar legível.");

  const button = ensureButton(p.primary);
  if (button.color !== p.primary)
    adjustments.push("Ajustamos a cor do botão para o texto dele ficar legível.");

  const tones = deriveTones({
    primary: button.color,
    background: p.background,
    surface: p.surface,
    text,
  });
  const secondary = p.secondary
    ? ensureContrast(p.secondary, p.background, AA_LARGE)
    : tones.primaryHover;

  return {
    theme,
    colors: {
      primary: button.color,
      primaryFg: button.fg,
      primaryHover: tones.primaryHover,
      primarySoft: tones.primarySoft,
      secondary,
      bg: p.background,
      surface: p.surface,
      surface2: tones.surface2,
      text,
      sub: p.muted ? ensureContrastAll(p.muted, [p.background, p.surface], AA_TEXT) : tones.sub,
      border: tones.border,
      link: tones.link,
    },
    adjustments,
  };
}

/** Variáveis CSS para o `style` da raiz da página pública. */
export function themeCssVars(r: ResolvedTheme): Record<string, string> {
  const c = r.colors;
  const radius = RADIUS[r.theme.radius];
  return {
    "--c-primary": c.primary,
    "--c-primary-fg": c.primaryFg,
    "--c-primary-hover": c.primaryHover,
    "--c-primary-soft": c.primarySoft,
    "--c-secondary": c.secondary,
    "--c-bg": c.bg,
    "--c-surface": c.surface,
    "--c-surface-2": c.surface2,
    "--c-text": c.text,
    "--c-sub": c.sub,
    "--c-border": c.border,
    "--c-link": c.link,
    "--radius": radius.card,
    "--radius-sm": radius.control,
    "--density": r.theme.density === "compact" ? "0.8" : "1",
    // Apelidos usados pelo fluxo de agendamento (até o CAL-150).
    "--accent": c.primary,
    "--accent-fg": c.primaryFg,
  };
}
