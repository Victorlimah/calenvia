/**
 * Aplicar um template (CAL-145/148): tema completo a partir dos metadados — paleta padrão,
 * fontes, cantos, densidade e formato do logo. Mantém seções e opções de logo do dono.
 */
import { NOTURNO_PALETTE, defaultSections, DEFAULT_ACCENT } from "./resolve";
import { findPalette, presetPalette } from "./palettes";
import { normalizeHex } from "./color";
import type { Theme } from "./schema";
import type { TemplateMeta } from "./template-meta";

export function themeFromTemplate(
  meta: TemplateMeta,
  opts: {
    accent?: string | null;
    base?: Theme | null;
    paletteId?: string;
    mode?: "light" | "dark";
  } = {},
): Theme {
  const paletteId = opts.paletteId ?? meta.paletteId;
  const preset = findPalette(paletteId);
  const mode = opts.mode ?? meta.mode;
  const palette = preset
    ? presetPalette(preset, mode)
    : { ...NOTURNO_PALETTE, primary: normalizeHex(opts.accent) ?? DEFAULT_ACCENT };
  return {
    version: 1,
    templateId: meta.id,
    ...(preset ? { paletteId: preset.id } : {}),
    palette,
    fontPairId: meta.fontPairId,
    radius: meta.radius,
    density: meta.density,
    logo: {
      show: opts.base?.logo.show ?? true,
      shape: meta.logoShape,
      placements: opts.base?.logo.placements ?? ["hero"],
    },
    sections: opts.base?.sections ?? defaultSections(),
    ...(opts.base?.photoStyle ? { photoStyle: opts.base.photoStyle } : {}),
  };
}
