/**
 * Biblioteca de paletas prontas (CAL-141). Cada uma tem versão clara e escura, com nome em
 * português. Todas passam AA sem correção (teste em palettes.test.ts): texto sobre fundo e
 * cartão, texto do botão e links.
 */
import type { Palette } from "./schema";

export type PaletteColors = Omit<Palette, "mode">;

export type PalettePreset = {
  id: string;
  name: string;
  /** Para quem combina (só texto de apoio na galeria). */
  hint: string;
  light: PaletteColors;
  dark: PaletteColors;
};

export const PALETTES: PalettePreset[] = [
  {
    id: "nude-rosado",
    name: "Nude rosado",
    hint: "Delicado e acolhedor",
    light: {
      primary: "#B4475F",
      secondary: "#E9C3B9",
      background: "#FBF4F1",
      surface: "#FFFFFF",
      text: "#3B2329",
      muted: "#6F5258",
    },
    dark: {
      primary: "#E8A0A8",
      secondary: "#8C5A60",
      background: "#1F1517",
      surface: "#2B1E21",
      text: "#F8EDEA",
      muted: "#D3BFBF",
    },
  },
  {
    id: "lavanda",
    name: "Lavanda suave",
    hint: "Calmo e feminino",
    light: {
      primary: "#7048B6",
      secondary: "#D9CCF2",
      background: "#F8F5FD",
      surface: "#FFFFFF",
      text: "#2B2140",
      muted: "#5E5574",
    },
    dark: {
      primary: "#C3AEF0",
      secondary: "#5B4787",
      background: "#18142A",
      surface: "#231D3A",
      text: "#F1ECFB",
      muted: "#C2B8D9",
    },
  },
  {
    id: "salvia",
    name: "Verde sálvia",
    hint: "Natural e tranquilo",
    light: {
      primary: "#4F6F52",
      secondary: "#C9D8C5",
      background: "#F4F6F1",
      surface: "#FFFFFF",
      text: "#1F2B21",
      muted: "#526054",
    },
    dark: {
      primary: "#A9C7A4",
      secondary: "#4F6F52",
      background: "#141B15",
      surface: "#1E281F",
      text: "#EEF3EC",
      muted: "#BACBB7",
    },
  },
  {
    id: "terracota",
    name: "Terracota",
    hint: "Quente e artesanal",
    light: {
      primary: "#A64B2A",
      secondary: "#EBC7AF",
      background: "#FBF5EF",
      surface: "#FFFFFF",
      text: "#3A2418",
      muted: "#6E5546",
    },
    dark: {
      primary: "#E59A72",
      secondary: "#8A4A30",
      background: "#1E1410",
      surface: "#2A1C16",
      text: "#F7ECE4",
      muted: "#D2BCAE",
    },
  },
  {
    id: "azul-petroleo",
    name: "Azul-petróleo",
    hint: "Sério e confiável",
    light: {
      primary: "#155E6E",
      secondary: "#BFDDE2",
      background: "#F2F7F8",
      surface: "#FFFFFF",
      text: "#10292F",
      muted: "#4A6268",
    },
    dark: {
      primary: "#6CC3D1",
      secondary: "#1D6B7A",
      background: "#0D1A1D",
      surface: "#142629",
      text: "#E8F3F5",
      muted: "#A9C3C8",
    },
  },
  {
    id: "vinho-creme",
    name: "Vinho e creme",
    hint: "Elegante e clássico",
    light: {
      primary: "#7A1F3D",
      secondary: "#E7D3B8",
      background: "#FBF7F0",
      surface: "#FFFFFF",
      text: "#2E1A20",
      muted: "#65525A",
    },
    dark: {
      primary: "#E7B8C6",
      secondary: "#7A1F3D",
      background: "#1C1014",
      surface: "#2A171E",
      text: "#F7EFE4",
      muted: "#D4C2C0",
    },
  },
  {
    id: "pessego",
    name: "Pêssego",
    hint: "Leve e alegre",
    light: {
      primary: "#B5502F",
      secondary: "#FFD3BD",
      background: "#FFF6F0",
      surface: "#FFFFFF",
      text: "#3D2418",
      muted: "#715446",
    },
    dark: {
      primary: "#FFB491",
      secondary: "#9C4A2D",
      background: "#1F1510",
      surface: "#2C1E17",
      text: "#FFF1E8",
      muted: "#DCC3B5",
    },
  },
  {
    id: "menta",
    name: "Menta fresca",
    hint: "Limpo e moderno",
    light: {
      primary: "#0F7A61",
      secondary: "#BDEBDD",
      background: "#F1FAF7",
      surface: "#FFFFFF",
      text: "#0F2A23",
      muted: "#47625B",
    },
    dark: {
      primary: "#6FDDBE",
      secondary: "#0F7A61",
      background: "#0C1A16",
      surface: "#132721",
      text: "#E7F7F1",
      muted: "#A6C9BE",
    },
  },
  {
    id: "grafite-dourado",
    name: "Grafite e dourado",
    hint: "Sofisticado",
    light: {
      primary: "#8A6516",
      secondary: "#E8D3A3",
      background: "#F7F6F3",
      surface: "#FFFFFF",
      text: "#1E1E21",
      muted: "#57575C",
    },
    dark: {
      primary: "#E3B65A",
      secondary: "#8A6516",
      background: "#151517",
      surface: "#202024",
      text: "#F4F1EA",
      muted: "#C3BEB4",
    },
  },
  {
    id: "preto-vermelho",
    name: "Preto e vermelho",
    hint: "Forte e marcante",
    light: {
      primary: "#B71C1C",
      secondary: "#F3C4C0",
      background: "#FAF7F6",
      surface: "#FFFFFF",
      text: "#1A1414",
      muted: "#5C5252",
    },
    dark: {
      primary: "#F2564B",
      secondary: "#8E1A16",
      background: "#0F0D0D",
      surface: "#1C1818",
      text: "#F6F0EF",
      muted: "#C7BDBB",
    },
  },
  {
    id: "azul-marinho",
    name: "Azul-marinho",
    hint: "Profissional",
    light: {
      primary: "#1F3A8A",
      secondary: "#C8D4F2",
      background: "#F4F6FB",
      surface: "#FFFFFF",
      text: "#141B2E",
      muted: "#4E5770",
    },
    dark: {
      primary: "#9DB5F5",
      secondary: "#2A4AA8",
      background: "#0C1222",
      surface: "#151D33",
      text: "#EDF1FA",
      muted: "#B2BCD4",
    },
  },
  {
    id: "areia-oliva",
    name: "Areia e oliva",
    hint: "Terroso e calmo",
    light: {
      primary: "#5E6B2A",
      secondary: "#E3D9BF",
      background: "#F8F5EC",
      surface: "#FFFFFF",
      text: "#2A2A1C",
      muted: "#5E5D4B",
    },
    dark: {
      primary: "#C3D08A",
      secondary: "#5E6B2A",
      background: "#16170F",
      surface: "#222418",
      text: "#F3F0E3",
      muted: "#C6C2AC",
    },
  },
  {
    id: "rosa-chiclete",
    name: "Rosa chiclete",
    hint: "Divertido e jovem",
    light: {
      primary: "#C2185B",
      secondary: "#FFC6DE",
      background: "#FFF4F8",
      surface: "#FFFFFF",
      text: "#3A1226",
      muted: "#6F4A5C",
    },
    dark: {
      primary: "#FF8DBF",
      secondary: "#A3164E",
      background: "#1E0F17",
      surface: "#2D1622",
      text: "#FFEFF6",
      muted: "#E0BCCD",
    },
  },
  {
    id: "cafe-com-leite",
    name: "Café com leite",
    hint: "Aconchegante",
    light: {
      primary: "#6B4A33",
      secondary: "#E6D3C2",
      background: "#F8F2EC",
      surface: "#FFFFFF",
      text: "#2E2019",
      muted: "#655247",
    },
    dark: {
      primary: "#D9B596",
      secondary: "#6B4A33",
      background: "#1A1310",
      surface: "#271D18",
      text: "#F5EBE2",
      muted: "#CDBBAD",
    },
  },
  {
    id: "oceano",
    name: "Oceano",
    hint: "Fresco e vibrante",
    light: {
      primary: "#0A6CB4",
      secondary: "#BCE0F7",
      background: "#F2F8FC",
      surface: "#FFFFFF",
      text: "#0F2436",
      muted: "#4A5F70",
    },
    dark: {
      primary: "#68B8F0",
      secondary: "#0A6CB4",
      background: "#0B1622",
      surface: "#122233",
      text: "#EAF4FB",
      muted: "#A9C0D2",
    },
  },
  {
    id: "monocromatico",
    name: "Monocromático claro",
    hint: "Minimalista",
    light: {
      primary: "#222222",
      secondary: "#DADADA",
      background: "#FAFAFA",
      surface: "#FFFFFF",
      text: "#1A1A1A",
      muted: "#5A5A5A",
    },
    dark: {
      primary: "#F2F2F2",
      secondary: "#555555",
      background: "#121212",
      surface: "#1E1E1E",
      text: "#F2F2F2",
      muted: "#BDBDBD",
    },
  },
];

export function findPalette(id: string | null | undefined): PalettePreset | null {
  return PALETTES.find((p) => p.id === id) ?? null;
}

/** Paleta pronta → paleta do tema no modo escolhido. */
export function presetPalette(preset: PalettePreset, mode: "light" | "dark"): Palette {
  return { mode, ...preset[mode] };
}
