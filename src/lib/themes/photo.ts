/**
 * Tratamento de foto (CAL-147): duotone com as cores do tema, por um filtro SVG
 * (feComponentTransfer). Puro: devolve os valores das tabelas de cada canal.
 */
import { normalizeHex } from "./color";

function channels(hex: string): [number, number, number] {
  const n = parseInt((normalizeHex(hex) ?? "#000000").slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const fmt = (v: number) => Number(v.toFixed(3)).toString();

/** Sombras viram `dark`, luzes viram `light` (ex.: texto do tema → cor principal suave). */
export function duotoneTables(dark: string, light: string): { r: string; g: string; b: string } {
  const d = channels(dark);
  const l = channels(light);
  return {
    r: `${fmt(d[0])} ${fmt(l[0])}`,
    g: `${fmt(d[1])} ${fmt(l[1])}`,
    b: `${fmt(d[2])} ${fmt(l[2])}`,
  };
}

export const PHOTO_STYLES = ["none", "duotone"] as const;
export type PhotoStyle = (typeof PHOTO_STYLES)[number];
