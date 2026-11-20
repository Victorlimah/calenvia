/**
 * Cores dos temas (CAL-140). Funções puras: contraste WCAG, cor de texto automática, mistura,
 * derivação de tons e ajuste até passar AA. Tudo em hexadecimal #RRGGBB.
 */
import { contrastRatio, isHexColor } from "@/lib/color";

export { contrastRatio, isHexColor };

/** AA para texto normal e para texto grande / elementos de interface. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

export const BLACK = "#000000";
export const WHITE = "#FFFFFF";
/** Tinta e papel padrão para texto automático (mais suaves que preto e branco puros). */
export const INK = "#111111";

type Rgb = [number, number, number];

/** "#abc", "abc", "#AABBCC" → "#AABBCC"; inválido → null. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  let v = input.trim();
  if (!v.startsWith("#")) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return isHexColor(v) ? v.toUpperCase() : null;
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  const c = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Mistura `a` com `b` (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb);
}

export function isDark(hex: string): boolean {
  return contrastRatio(hex, WHITE) > contrastRatio(hex, BLACK);
}

/** Texto (tinta ou branco) com mais contraste sobre `bg`. */
export function autoTextOn(bg: string): string {
  return contrastRatio(bg, INK) >= contrastRatio(bg, WHITE) ? INK : WHITE;
}

/**
 * Ajusta `fg` até ter pelo menos `min` de contraste sobre `bg`, mantendo o tom: escurece se o
 * fundo é claro, clareia se o fundo é escuro. Se nem assim passar, usa a cor automática.
 */
export function ensureContrast(fg: string, bg: string, min: number = AA_TEXT): string {
  if (contrastRatio(fg, bg) >= min) return fg.toUpperCase();
  const target = isDark(bg) ? WHITE : BLACK;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(fg, target, t);
    if (contrastRatio(c, bg) >= min) return c;
  }
  return autoTextOn(bg);
}

/** Como `ensureContrast`, mas precisa passar sobre todos os fundos (ex.: página e cartão). */
export function ensureContrastAll(fg: string, bgs: string[], min: number = AA_TEXT): string {
  let c = fg.toUpperCase();
  for (let i = 0; i < 3; i++) {
    for (const bg of bgs) c = ensureContrast(c, bg, min);
    if (bgs.every((bg) => contrastRatio(c, bg) >= min)) return c;
  }
  // Fundos muito diferentes entre si: a cor automática do mais "difícil".
  const worst = bgs.reduce((a, b) => (contrastRatio(c, a) < contrastRatio(c, b) ? a : b));
  return autoTextOn(worst);
}

/**
 * Botão na cor principal com texto legível por cima (4,5:1). O botão é identificado pelo
 * próprio texto, então a cor só muda quando nem tinta nem branco passam (cores de meio-tom):
 * aí escurece ou clareia o mínimo necessário.
 */
export function ensureButton(primary: string): { color: string; fg: string } {
  const color = primary.toUpperCase();
  const fg = autoTextOn(color);
  if (contrastRatio(fg, color) >= AA_TEXT) return { color, fg };
  const toward = fg === WHITE ? BLACK : WHITE;
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(color, toward, t);
    if (contrastRatio(fg, c) >= AA_TEXT) return { color: c, fg };
  }
  return { color: toward === BLACK ? BLACK : WHITE, fg: toward === BLACK ? WHITE : INK };
}

export type Tones = {
  primaryHover: string;
  primarySoft: string;
  surface2: string;
  border: string;
  sub: string;
  link: string;
};

/**
 * Tons derivados de 1–2 cores: hover do botão, fundo suave da cor principal, segunda
 * superfície, borda, texto secundário e cor de link (todos com AA onde é texto).
 */
export function deriveTones(p: {
  primary: string;
  background: string;
  surface: string;
  text: string;
}): Tones {
  const dark = isDark(p.background);
  return {
    primaryHover: mix(p.primary, dark ? WHITE : BLACK, 0.12),
    primarySoft: mix(p.background, p.primary, dark ? 0.22 : 0.12),
    surface2: mix(p.surface, p.text, 0.06),
    border: mix(p.background, p.text, dark ? 0.2 : 0.16),
    sub: ensureContrastAll(mix(p.text, p.background, 0.3), [p.background, p.surface], AA_TEXT),
    link: ensureContrast(p.primary, p.background, AA_TEXT),
  };
}
