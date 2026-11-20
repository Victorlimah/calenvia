/**
 * Logo opcional (CAL-143): monograma de quem não tem logo e sugestão de paleta pela cor do
 * logo. Funções puras (os pixels vêm de um canvas no navegador).
 */
import { mix, normalizeHex } from "./color";
import { PALETTES, type PalettePreset } from "./palettes";

const SMALL_WORDS = new Set(["da", "de", "do", "das", "dos", "e", "a", "o", "&"]);

/** "Studio da Bela Nails" → "SB"; "Zé" → "Z". Até 2 letras, sem preposições. */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !SMALL_WORDS.has(w.toLowerCase()));
  const letters = (words.length ? words : [name.trim()])
    .slice(0, 2)
    .map((w) => w.normalize("NFC").charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

/**
 * Cor mais marcante do logo: ignora pixels transparentes, quase brancos e quase pretos e
 * agrupa por tom; devolve a média do grupo mais "colorido e frequente". null se o logo for
 * só preto/branco/cinza.
 */
export function dominantColor(rgba: ArrayLike<number>): string | null {
  const buckets = new Map<number, { r: number; g: number; b: number; n: number; s: number }>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const a = rgba[i + 3];
    if (a < 128) continue;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const hex = toHex(r, g, b);
    const c = hsl(hex);
    if (c.l > 0.92 || c.l < 0.08 || c.s < 0.18) continue;
    const key = Math.round(c.h / 20) % 18;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0, s: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    bucket.s += c.s;
    buckets.set(key, bucket);
  }
  let best: { r: number; g: number; b: number; n: number; s: number } | null = null;
  for (const b of buckets.values()) {
    if (!best || b.n * (b.s / b.n) > best.n * (best.s / best.n)) best = b;
  }
  if (!best || best.n === 0) return null;
  return toHex(best.r / best.n, best.g / best.n, best.b / best.n);
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Paleta pronta cujo tom principal mais se parece com a cor (cinza → monocromático). */
export function closestPalette(color: string): PalettePreset {
  const hex = normalizeHex(color) ?? "#777777";
  const c = hsl(hex);
  if (c.s < 0.15) return PALETTES.find((p) => p.id === "monocromatico") ?? PALETTES[0];
  let best = PALETTES[0];
  let bestScore = Infinity;
  for (const p of PALETTES) {
    if (p.id === "monocromatico") continue;
    const pc = hsl(p.light.primary);
    const score = hueDistance(c.h, pc.h) + Math.abs(c.l - pc.l) * 60;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/** Cor do logo pronta para virar cor principal (um pouco mais firme se estiver clara demais). */
export function logoPrimary(color: string): string {
  const hex = normalizeHex(color) ?? "#4B3FD9";
  return hsl(hex).l > 0.75 ? mix(hex, "#000000", 0.25) : hex;
}

export type LogoChoice = { url: string | null; alt: string };

/** Qual logo mostrar: a versão para fundo escuro quando existe e o fundo é escuro. */
export function pickLogo(input: {
  name: string;
  logoUrl: string | null | undefined;
  logoAltUrl?: string | null;
  mode: "light" | "dark";
  show: boolean;
}): LogoChoice {
  const alt = `Logo da ${input.name}`;
  if (!input.show) return { url: null, alt };
  const url = input.mode === "dark" && input.logoAltUrl ? input.logoAltUrl : input.logoUrl;
  return { url: url ?? null, alt };
}

/** Posições do logo (padrão: só na abertura, como antes). */
export function logoPlacements(theme: {
  logo: { placements?: ("header" | "hero" | "footer")[] };
}): ("header" | "hero" | "footer")[] {
  return theme.logo.placements?.length ? theme.logo.placements : ["hero"];
}
