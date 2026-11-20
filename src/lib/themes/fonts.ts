/**
 * Fontes dos temas (CAL-142) com next/font. `preload: false`: o navegador só baixa o arquivo
 * da fonte que a página realmente usa (as declarações @font-face das outras não pesam).
 * Bricolage e Inter (par padrão) já vêm do layout raiz.
 */
import {
  DM_Sans,
  DM_Serif_Display,
  Dancing_Script,
  Lato,
  Libre_Baskerville,
  Manrope,
  Nunito,
  Outfit,
  Playfair_Display,
  Quicksand,
  Source_Sans_3,
} from "next/font/google";
import { findFontPair } from "./font-pairs";

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-playfair",
  weight: ["600", "700"],
});
const lato = Lato({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-lato",
  weight: ["400", "700"],
});
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-outfit",
  weight: ["600", "800"],
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dm-sans",
  weight: ["400", "600", "700"],
});
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-nunito",
  weight: ["400", "600", "800"],
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dm-serif",
  weight: "400",
});
const dancing = Dancing_Script({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dancing",
  weight: ["600", "700"],
});
const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-quicksand",
  weight: ["400", "600", "700"],
});
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-baskerville",
  weight: ["400", "700"],
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-source-sans",
  weight: ["400", "600", "700"],
});
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-manrope",
  weight: ["400", "600", "800"],
});

const BY_VAR: Record<string, string> = {
  "--font-playfair": playfair.variable,
  "--font-lato": lato.variable,
  "--font-outfit": outfit.variable,
  "--font-dm-sans": dmSans.variable,
  "--font-nunito": nunito.variable,
  "--font-dm-serif": dmSerif.variable,
  "--font-dancing": dancing.variable,
  "--font-quicksand": quicksand.variable,
  "--font-baskerville": baskerville.variable,
  "--font-source-sans": sourceSans.variable,
  "--font-manrope": manrope.variable,
};

/** Classes que definem as variáveis das fontes de um par (só as dele). */
export function fontPairClassName(id: string | null | undefined): string {
  const f = findFontPair(id);
  return [...new Set([BY_VAR[f.displayVar], BY_VAR[f.bodyVar]])].filter(Boolean).join(" ");
}

/** Todas as fontes (para a galeria do editor mostrar cada par). */
export const ALL_FONT_CLASSNAMES = Object.values(BY_VAR).join(" ");
