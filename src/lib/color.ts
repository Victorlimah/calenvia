/** Utilidades de cor para a cor de destaque do negócio. */

export const ACCENT_PRESETS = [
  "#F5B014", // âmbar
  "#E8B04A", // dourado
  "#E0457B", // rosa
  "#D94B3F", // vermelho
  "#4B3FD9", // índigo Calenvia
  "#2F80ED", // azul
  "#1F9D55", // verde
  "#14B8A6", // turquesa
  "#9B51E0", // roxo
  "#F2994A", // laranja
];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Cor do texto (preto ou branco) com melhor contraste sobre a cor de fundo. */
export function readableTextOn(hex: string): "#111111" | "#FFFFFF" {
  if (!isHexColor(hex)) return "#FFFFFF";
  return contrastRatio(hex, "#111111") >= contrastRatio(hex, "#FFFFFF") ? "#111111" : "#FFFFFF";
}
