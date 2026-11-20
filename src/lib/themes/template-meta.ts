/**
 * Metadados dos templates (CAL-144): dados puros (sem React), usados pela galeria, pela
 * ordenação por segmento e pelos testes. Os componentes ficam em templates/{id}/.
 */
import type { SegmentId } from "@/lib/business/segments";
import type { DensityId, LogoShape, RadiusId } from "./schema";

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  /** Segmentos para os quais o template é indicado (CAL-149). */
  segments: SegmentId[];
  /** Paleta padrão (id de PALETTES) e modo; sem id = paleta própria do template. */
  paletteId?: string;
  mode: "light" | "dark";
  /** Duas paletas alternativas recomendadas. */
  altPaletteIds: [string, string];
  fontPairId: string;
  radius: RadiusId;
  density: DensityId;
  logoShape: LogoShape;
};

export const NOTURNO_META: TemplateMeta = {
  id: "noturno",
  name: "Noturno",
  description: "Escuro, ousado, títulos enormes",
  segments: ["barbearia", "tatuagem", "personal"],
  mode: "dark",
  altPaletteIds: ["grafite-dourado", "preto-vermelho"],
  fontPairId: "bricolage-inter",
  radius: "soft",
  density: "comfortable",
  logoShape: "square",
};

export const DELICADO_META: TemplateMeta = {
  id: "delicado",
  name: "Delicado",
  description: "Claro e quente, serifada elegante, detalhes finos",
  segments: ["salao", "manicure", "estetica", "sobrancelha"],
  paletteId: "nude-rosado",
  mode: "light",
  altPaletteIds: ["lavanda", "pessego"],
  fontPairId: "elegante",
  radius: "soft",
  density: "comfortable",
  logoShape: "round",
};

export const CLINICO_META: TemplateMeta = {
  id: "clinico",
  name: "Clínico",
  description: "Limpo, muito respiro e selos de confiança",
  segments: ["clinica", "psicologia", "fisioterapia"],
  paletteId: "azul-petroleo",
  mode: "light",
  altPaletteIds: ["menta", "azul-marinho"],
  fontPairId: "limpa",
  radius: "soft",
  density: "comfortable",
  logoShape: "square",
};

export const VITRINE_META: TemplateMeta = {
  id: "vitrine",
  name: "Vitrine",
  description: "Fotos em destaque, estilo portfólio",
  segments: ["manicure", "sobrancelha", "tatuagem", "estetica"],
  paletteId: "rosa-chiclete",
  mode: "light",
  altPaletteIds: ["monocromatico", "lavanda"],
  fontPairId: "geometrica",
  radius: "square",
  density: "compact",
  logoShape: "round",
};

export const NATUREZA_META: TemplateMeta = {
  id: "natureza",
  name: "Natureza",
  description: "Tons de terra e verde, formas orgânicas e calma",
  segments: ["estetica", "pilates", "fisioterapia", "psicologia"],
  paletteId: "salvia",
  mode: "light",
  altPaletteIds: ["areia-oliva", "terracota"],
  fontPairId: "classica",
  radius: "round",
  density: "comfortable",
  logoShape: "round",
};

export const ALEGRE_META: TemplateMeta = {
  id: "alegre",
  name: "Alegre",
  description: "Cores vivas, cantos redondos e tom divertido",
  segments: ["pet", "lava-jato", "personal", "outro"],
  paletteId: "oceano",
  mode: "light",
  altPaletteIds: ["rosa-chiclete", "pessego"],
  fontPairId: "amigavel",
  radius: "round",
  density: "comfortable",
  logoShape: "round",
};

export const EDITORIAL_META: TemplateMeta = {
  id: "editorial",
  name: "Editorial",
  description: "Cara de revista: tipografia grande, preto e branco com um toque de cor",
  segments: ["salao", "estetica", "tatuagem", "clinica"],
  paletteId: "papel-e-tinta",
  mode: "light",
  altPaletteIds: ["preto-vermelho", "azul-marinho"],
  fontPairId: "editorial",
  radius: "square",
  density: "comfortable",
  logoShape: "square",
};

export const BOUTIQUE_META: TemplateMeta = {
  id: "boutique",
  name: "Boutique",
  description: "Luxo discreto, serifada fina, muito espaço e uma cor só",
  segments: ["estetica", "salao", "sobrancelha", "clinica"],
  paletteId: "vinho-creme",
  mode: "light",
  altPaletteIds: ["cafe-com-leite", "grafite-dourado"],
  fontPairId: "elegante",
  radius: "square",
  density: "comfortable",
  logoShape: "free",
};

export const POP_META: TemplateMeta = {
  id: "pop",
  name: "Pop",
  description: "Colorido, blocos e formas geométricas, jovem",
  segments: ["personal", "pet", "manicure", "outro"],
  paletteId: "lavanda",
  mode: "light",
  altPaletteIds: ["rosa-chiclete", "menta"],
  fontPairId: "geometrica",
  radius: "soft",
  density: "comfortable",
  logoShape: "round",
};

export const MINIMALISTA_META: TemplateMeta = {
  id: "minimalista",
  name: "Minimalista",
  description: "Só tipografia e linhas finas",
  segments: ["psicologia", "clinica", "fisioterapia", "outro"],
  paletteId: "monocromatico",
  mode: "light",
  altPaletteIds: ["areia-oliva", "azul-marinho"],
  fontPairId: "limpa",
  radius: "square",
  density: "compact",
  logoShape: "free",
};

export const RETRO_META: TemplateMeta = {
  id: "retro",
  name: "Retrô",
  description: "Anos 70, listras e cores quentes",
  segments: ["barbearia", "tatuagem", "lava-jato"],
  paletteId: "terracota",
  mode: "light",
  altPaletteIds: ["cafe-com-leite", "preto-vermelho"],
  fontPairId: "editorial",
  radius: "round",
  density: "comfortable",
  logoShape: "round",
};

export const FLORAL_META: TemplateMeta = {
  id: "floral",
  name: "Floral",
  description: "Romântico, tons pastel e detalhes botânicos",
  segments: ["estetica", "salao", "manicure", "sobrancelha"],
  paletteId: "pessego",
  mode: "light",
  altPaletteIds: ["nude-rosado", "lavanda"],
  fontPairId: "manuscrita",
  radius: "round",
  density: "comfortable",
  logoShape: "round",
};
