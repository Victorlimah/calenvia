/**
 * Contrato do tema do negócio (CAL-140), guardado em `businesses.theme` (jsonb).
 * Chaves em inglês (CLAUDE.md); a interface fala português. Ver docs/planos/CAL-140.md.
 */
import { z } from "zod";
import { normalizeHex } from "./color";

export const THEME_VERSION = 1;

/** Seções da página pública. Abertura e chamada final são fixas (sempre visíveis, nas pontas). */
export const SECTION_IDS = [
  "hero",
  "how",
  "services",
  "gallery",
  "team",
  "testimonials",
  "location",
  "faq",
  "final",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export const FIXED_SECTIONS: SectionId[] = ["hero", "final"];

export const RADIUS_IDS = ["square", "soft", "round"] as const;
export type RadiusId = (typeof RADIUS_IDS)[number];
export const DENSITY_IDS = ["compact", "comfortable"] as const;
export type DensityId = (typeof DENSITY_IDS)[number];
export const LOGO_SHAPES = ["square", "round", "free"] as const;
export type LogoShape = (typeof LOGO_SHAPES)[number];

const hex = z.string().transform((v, ctx) => {
  const n = normalizeHex(v);
  if (!n) {
    ctx.addIssue({ code: "custom", message: "Cor inválida. Use o formato #RRGGBB." });
    return z.NEVER;
  }
  return n;
});

const slugId = z.string().regex(/^[a-z0-9-]{2,40}$/, "Identificador inválido.");

export const paletteSchema = z.object({
  mode: z.enum(["light", "dark"]),
  primary: hex,
  secondary: hex.optional(),
  background: hex,
  surface: hex,
  text: hex,
  /** Texto secundário (opcional; sem ele, derivado do texto e do fundo). */
  muted: hex.optional(),
});
export type Palette = z.output<typeof paletteSchema>;

export const sectionSettingSchema = z.object({
  id: z.enum(SECTION_IDS),
  visible: z.boolean(),
  order: z.number().int().min(0).max(100),
});
export type SectionSetting = z.output<typeof sectionSettingSchema>;

export const themeSchema = z.object({
  version: z.literal(THEME_VERSION),
  templateId: slugId,
  paletteId: slugId.optional(),
  palette: paletteSchema,
  fontPairId: slugId,
  radius: z.enum(RADIUS_IDS),
  density: z.enum(DENSITY_IDS),
  logo: z.object({ show: z.boolean(), shape: z.enum(LOGO_SHAPES) }),
  sections: z
    .array(sectionSettingSchema)
    .max(SECTION_IDS.length)
    .refine((list) => new Set(list.map((s) => s.id)).size === list.length, {
      message: "Seção repetida.",
    }),
});

export type Theme = z.output<typeof themeSchema>;
export type ThemeInput = z.input<typeof themeSchema>;
