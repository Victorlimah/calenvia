/**
 * Edição de cores do tema (CAL-141). Funções puras usadas pelo editor no navegador e testadas.
 * O resultado sempre passa pelo resolveTheme(), que garante AA e explica o que ajustou.
 */
import { autoTextOn, isDark, mix, normalizeHex, WHITE } from "./color";
import { findPalette, presetPalette, type PalettePreset } from "./palettes";
import { FONT_PAIRS } from "./font-pairs";
import {
  DENSITY_IDS,
  RADIUS_IDS,
  type DensityId,
  type Palette,
  type RadiusId,
  type Theme,
} from "./schema";

/** Aplica uma paleta pronta (no modo pedido; sem modo, mantém o atual). */
export function choosePreset(theme: Theme, preset: PalettePreset, mode?: Palette["mode"]): Theme {
  const m = mode ?? theme.palette.mode;
  return { ...theme, paletteId: preset.id, palette: presetPalette(preset, m) };
}

/** Paleta própria a partir de uma cor (sem paleta pronta): fundo neutro claro ou escuro. */
export function paletteFromColor(primary: string, mode: Palette["mode"]): Palette {
  if (mode === "dark") {
    return {
      mode,
      primary,
      background: mix("#0F0F10", primary, 0.06),
      surface: mix("#1B1B1D", primary, 0.08),
      text: "#F5F3EF",
      muted: "#C4C0B8",
    };
  }
  return {
    mode,
    primary,
    background: mix("#FBFAF7", primary, 0.04),
    surface: WHITE,
    text: "#1C1B1F",
    muted: "#55535B",
  };
}

/** Claro ↔ escuro: paleta pronta troca de versão; paleta própria é refeita com a mesma cor. */
export function setMode(theme: Theme, mode: Palette["mode"]): Theme {
  if (theme.palette.mode === mode) return theme;
  const preset = findPalette(theme.paletteId);
  if (preset && !isModifiedFromPreset(theme)) return choosePreset(theme, preset, mode);
  const next = paletteFromColor(theme.palette.primary, mode);
  return {
    ...theme,
    palette: theme.palette.secondary ? { ...next, secondary: theme.palette.secondary } : next,
  };
}

/** Cor principal digitada/escolhida. `null` se a cor for inválida (o editor mostra o erro). */
export function setPrimary(theme: Theme, value: string): Theme | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return { ...theme, palette: { ...theme.palette, primary: hex } };
}

/** Cor secundária (opcional). Vazio remove. `null` se inválida. */
export function setSecondary(theme: Theme, value: string): Theme | null {
  if (!value.trim()) {
    const { secondary: _drop, ...rest } = theme.palette;
    void _drop;
    return { ...theme, palette: rest };
  }
  const hex = normalizeHex(value);
  if (!hex) return null;
  return { ...theme, palette: { ...theme.palette, secondary: hex } };
}

/** A paleta foi mexida depois de escolhida? (mostra "Voltar à paleta original") */
export function isModifiedFromPreset(theme: Theme): boolean {
  const preset = findPalette(theme.paletteId);
  if (!preset) return false;
  const original = presetPalette(preset, theme.palette.mode);
  return (
    (Object.keys(original) as (keyof Palette)[]).some((k) => original[k] !== theme.palette[k]) ||
    Boolean(theme.palette.secondary && !original.secondary)
  );
}

/** Volta às cores da paleta pronta escolhida (no modo atual). */
export function revertToPreset(theme: Theme): Theme {
  const preset = findPalette(theme.paletteId);
  return preset ? choosePreset(theme, preset) : theme;
}

/** Texto de exemplo do botão (para a prévia das bolinhas). */
export function swatchText(color: string): string {
  return autoTextOn(color);
}

export { isDark };

/** Par de fontes (CAL-142). Id desconhecido é ignorado. */
export function setFontPair(theme: Theme, id: string): Theme {
  return FONT_PAIRS.some((f) => f.id === id) ? { ...theme, fontPairId: id } : theme;
}

/** Cantos (retos · suaves · bem arredondados). */
export function setRadius(theme: Theme, radius: RadiusId): Theme {
  return RADIUS_IDS.includes(radius) ? { ...theme, radius } : theme;
}

/** Densidade (compacta · confortável). */
export function setDensity(theme: Theme, density: DensityId): Theme {
  return DENSITY_IDS.includes(density) ? { ...theme, density } : theme;
}
