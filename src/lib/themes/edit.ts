/**
 * Edição de cores do tema (CAL-141). Funções puras usadas pelo editor no navegador e testadas.
 * O resultado sempre passa pelo resolveTheme(), que garante AA e explica o que ajustou.
 */
import { autoTextOn, isDark, mix, normalizeHex, WHITE } from "./color";
import { findPalette, presetPalette, type PalettePreset } from "./palettes";
import { FONT_PAIRS } from "./font-pairs";
import { orderedSections } from "./resolve";
import {
  DENSITY_IDS,
  FIXED_SECTIONS,
  RADIUS_IDS,
  type DensityId,
  type Palette,
  type RadiusId,
  type Theme,
  type SectionId,
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

/** Opções do logo (CAL-143): mostrar, formato e onde aparece (pelo menos um lugar). */
export function setLogoOptions(theme: Theme, patch: Partial<Theme["logo"]>): Theme {
  const logo = { ...theme.logo, ...patch };
  if (logo.placements && logo.placements.length === 0) logo.placements = ["hero"];
  return { ...theme, logo };
}

/** Nomes das seções na interface (CAL-144). */
export const SECTION_LABELS: Record<SectionId, string> = {
  hero: "Abertura",
  how: "Como funciona",
  services: "Serviços",
  gallery: "Fotos do trabalho",
  team: "Equipe",
  testimonials: "Depoimentos",
  location: "Onde fica e horários",
  faq: "Dúvidas",
  final: "Chamada final",
};

/** Seções que o dono pode mexer, na ordem atual (abertura e chamada final ficam fixas). */
export function editableSections(theme: Theme): { id: SectionId; visible: boolean }[] {
  return orderedSections(theme.sections).filter((s) => !FIXED_SECTIONS.includes(s.id));
}

function withSections(theme: Theme, list: { id: SectionId; visible: boolean }[]): Theme {
  const middle = list.map((s, i) => ({ id: s.id, visible: s.visible, order: i + 1 }));
  return {
    ...theme,
    sections: [
      { id: "hero", visible: true, order: 0 },
      ...middle,
      { id: "final", visible: true, order: middle.length + 1 },
    ],
  };
}

/** Mostra/esconde uma seção (abertura e chamada final não podem ser escondidas). */
export function toggleSection(theme: Theme, id: SectionId): Theme {
  if (FIXED_SECTIONS.includes(id)) return theme;
  return withSections(
    theme,
    editableSections(theme).map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
  );
}

/** Sobe (-1) ou desce (+1) uma seção entre as editáveis. */
export function moveSection(theme: Theme, id: SectionId, dir: -1 | 1): Theme {
  const list = editableSections(theme);
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return theme;
  [list[i], list[j]] = [list[j], list[i]];
  return withSections(theme, list);
}
