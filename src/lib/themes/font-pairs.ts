/**
 * Pares de fontes dos temas (CAL-142): títulos + texto, todas do Google Fonts (gratuitas),
 * carregadas com next/font em src/lib/themes/fonts.ts. Aqui só os dados (puros, testáveis).
 */
export type FontPair = {
  id: string;
  name: string;
  /** Estilo, em português simples. */
  description: string;
  /** Variáveis CSS criadas pelo next/font (ver fonts.ts). */
  displayVar: string;
  bodyVar: string;
  /** Pilha de reserva enquanto a fonte carrega (font-display: swap). */
  displayFallback: string;
  bodyFallback: string;
};

const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const FONT_PAIRS: FontPair[] = [
  {
    id: "bricolage-inter",
    name: "Moderna ousada",
    description: "Títulos fortes e modernos",
    displayVar: "--font-bricolage",
    bodyVar: "--font-inter",
    displayFallback: SANS,
    bodyFallback: SANS,
  },
  {
    id: "elegante",
    name: "Elegante",
    description: "Serifada fina, ar de salão e estética",
    displayVar: "--font-playfair",
    bodyVar: "--font-lato",
    displayFallback: SERIF,
    bodyFallback: SANS,
  },
  {
    id: "geometrica",
    name: "Geométrica",
    description: "Limpa e atual",
    displayVar: "--font-outfit",
    bodyVar: "--font-dm-sans",
    displayFallback: SANS,
    bodyFallback: SANS,
  },
  {
    id: "amigavel",
    name: "Arredondada amigável",
    description: "Leve e simpática",
    displayVar: "--font-nunito",
    bodyVar: "--font-nunito",
    displayFallback: SANS,
    bodyFallback: SANS,
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Cara de revista",
    displayVar: "--font-dm-serif",
    bodyVar: "--font-dm-sans",
    displayFallback: SERIF,
    bodyFallback: SANS,
  },
  {
    id: "manuscrita",
    name: "Manuscrita",
    description: "Títulos escritos à mão, texto simples",
    displayVar: "--font-dancing",
    bodyVar: "--font-quicksand",
    displayFallback: "cursive",
    bodyFallback: SANS,
  },
  {
    id: "classica",
    name: "Clássica",
    description: "Tradicional e confiável",
    displayVar: "--font-baskerville",
    bodyVar: "--font-source-sans",
    displayFallback: SERIF,
    bodyFallback: SANS,
  },
  {
    id: "limpa",
    name: "Limpa",
    description: "Clara e objetiva, boa para clínicas",
    displayVar: "--font-manrope",
    bodyVar: "--font-manrope",
    displayFallback: SANS,
    bodyFallback: SANS,
  },
];

export const DEFAULT_FONT_PAIR_ID = "bricolage-inter";

export function findFontPair(id: string | null | undefined): FontPair {
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0];
}

/** Valores das variáveis --t-font-display / --t-font-body para a raiz da página. */
export function fontPairVars(id: string | null | undefined): Record<string, string> {
  const f = findFontPair(id);
  return {
    "--t-font-display": `var(${f.displayVar}), ${f.displayFallback}`,
    "--t-font-body": `var(${f.bodyVar}), ${f.bodyFallback}`,
  };
}
