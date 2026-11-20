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
