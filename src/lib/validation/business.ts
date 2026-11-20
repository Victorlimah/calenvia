import { z } from "zod";
import { parsePriceToCents } from "@/lib/money";
import { normalizePhone } from "@/lib/phone";
import { validateSlug } from "@/lib/slug";
import { timeToMinutes } from "@/lib/dates";
import { SEGMENT_IDS } from "@/lib/business/segments";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

export const whatsappField = z
  .string()
  .trim()
  .min(1, "Informe o WhatsApp.")
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Número inválido. Use DDD + número." });
      return z.NEVER;
    }
    return n;
  });

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((v, ctx) => {
    const err = validateSlug(v);
    if (err) ctx.addIssue({ code: "custom", message: err });
  });

/** Valida o fuso informado (só zonas IANA válidas). */
export const timezoneField = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "Fuso horário inválido.");

export const businessInfoSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio.").max(80),
  segment: z.enum(SEGMENT_IDS, { message: "Escolha o tipo de negócio." }),
  address: z.string().trim().min(5, "Informe o endereço.").max(200),
  address_reference: optionalText(200),
  whatsapp: whatsappField,
  instagram: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) =>
      v
        ? v
            .replace(/^@/, "")
            .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
            .replace(/\/$/, "")
        : null,
    ),
  slug: slugField,
  timezone: timezoneField,
});
export type BusinessInfoInput = z.input<typeof businessInfoSchema>;
export type BusinessInfo = z.output<typeof businessInfoSchema>;

export const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome do serviço.").max(80),
  description: optionalText(300),
  duration_min: z.coerce
    .number({ message: "Informe a duração." })
    .int()
    .min(5, "Mínimo de 5 minutos.")
    .max(720, "Máximo de 12 horas."),
  price: z.string().transform((v, ctx) => {
    const cents = parsePriceToCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Preço inválido. Ex.: 40 ou 40,00" });
      return z.NEVER;
    }
    return cents;
  }),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});
export type ServiceInput = z.input<typeof serviceSchema>;

export const staffSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome.").max(80),
  role: optionalText(60),
  is_active: z.boolean().default(true),
  service_ids: z.array(z.string().uuid()).default([]),
});
export type StaffInput = z.input<typeof staffSchema>;

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora inválida.");

const dayHoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    is_open: z.boolean(),
    opens_at: timeField.nullable(),
    closes_at: timeField.nullable(),
    breaks: z.array(z.object({ starts_at: timeField, ends_at: timeField })).default([]),
  })
  .superRefine((day, ctx) => {
    if (!day.is_open) return;
    if (!day.opens_at || !day.closes_at) {
      ctx.addIssue({
        code: "custom",
        message: "Informe abertura e fechamento.",
        path: ["opens_at"],
      });
      return;
    }
    const open = timeToMinutes(day.opens_at);
    const close = timeToMinutes(day.closes_at);
    if (open >= close) {
      ctx.addIssue({
        code: "custom",
        message: "O fechamento precisa ser depois da abertura.",
        path: ["closes_at"],
      });
      return;
    }
    const sorted = [...day.breaks]
      .map((b) => ({ s: timeToMinutes(b.starts_at), e: timeToMinutes(b.ends_at) }))
      .sort((a, b) => a.s - b.s);
    sorted.forEach((b, i) => {
      if (b.s >= b.e) {
        ctx.addIssue({
          code: "custom",
          message: "O intervalo termina antes de começar.",
          path: ["breaks"],
        });
      } else if (b.s < open || b.e > close) {
        ctx.addIssue({
          code: "custom",
          message: "O intervalo precisa estar dentro do horário de funcionamento.",
          path: ["breaks"],
        });
      } else if (i > 0 && b.s < sorted[i - 1].e) {
        ctx.addIssue({
          code: "custom",
          message: "Intervalos não podem se sobrepor.",
          path: ["breaks"],
        });
      }
    });
  });

export const weekHoursSchema = z
  .array(dayHoursSchema)
  .length(7)
  .refine((days) => new Set(days.map((d) => d.weekday)).size === 7, "Dias repetidos.");
export type DayHours = z.input<typeof dayHoursSchema>;

export const agendaRulesSchema = z.object({
  slot_interval_min: z.coerce
    .number()
    .refine((v) => [15, 30, 60].includes(v), "Escolha 15, 30 ou 60."),
  min_notice_min: z.coerce.number().int().min(0).max(10080),
  max_days_ahead: z.coerce
    .number()
    .int()
    .min(1, "Mínimo de 1 dia.")
    .max(365, "Máximo de 365 dias."),
  cancel_notice_min: z.coerce.number().int().min(0).max(10080),
});
export type AgendaRulesInput = z.input<typeof agendaRulesSchema>;

/** Horário padrão sugerido no onboarding: seg–sex 9h–18h com almoço, sáb 9h–13h. */
export function defaultWeekHours(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => {
    if (weekday === 0)
      return { weekday, is_open: false, opens_at: null, closes_at: null, breaks: [] };
    if (weekday === 6)
      return { weekday, is_open: true, opens_at: "09:00", closes_at: "13:00", breaks: [] };
    return {
      weekday,
      is_open: true,
      opens_at: "09:00",
      closes_at: "18:00",
      breaks: [{ starts_at: "12:00", ends_at: "13:00" }],
    };
  });
}

export const appearanceSchema = z.object({
  /** Opcional desde o CAL-141: a cor vem da paleta do tema (saveThemeAction). */
  accent_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.")
    .optional(),
  headline: z
    .string()
    .trim()
    .max(90, "Use no máximo 90 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
  subheadline: z
    .string()
    .trim()
    .max(200, "Use no máximo 200 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
});
export type AppearanceInput = z.input<typeof appearanceSchema>;

export const testimonialSchema = z.object({
  author_name: z.string().trim().min(1, "Informe o nome.").max(60),
  text: z.string().trim().min(5, "Escreva o depoimento.").max(400, "Use no máximo 400 caracteres."),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;
