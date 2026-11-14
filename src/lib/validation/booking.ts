import { z } from "zod";
import { normalizeMobile } from "@/lib/phone";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80, "Use no máximo 80 caracteres."),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Informe seu WhatsApp.")
    .refine((v) => normalizeMobile(v) !== null, "Confira o número: DDD + celular com 9 dígitos."),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const bookingSchema = customerSchema.extend({
  slug: z.string().min(3).max(40),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  start: z.string().datetime({ offset: true }),
  /** Campo-isca contra robôs: humanos não preenchem. */
  website: z.string().max(0).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;
