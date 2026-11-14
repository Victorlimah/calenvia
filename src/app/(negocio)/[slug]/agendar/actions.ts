"use server";

import { z } from "zod";
import { getPublicBusiness, getPublicCatalog } from "@/lib/public/business";
import { publicAvailability, type PublicAvailability } from "@/lib/public/availability";
import { isBookingOpen } from "@/lib/plans";

const availabilityInput = z.object({
  slug: z.string().min(3).max(40),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export async function availabilityAction(
  input: unknown,
): Promise<{ ok: true; data: PublicAvailability } | { ok: false; error: string }> {
  const parsed = availabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const business = await getPublicBusiness(parsed.data.slug);
  if (!business || !isBookingOpen(business)) return { ok: false, error: "Agenda indisponível." };
  const { services, staff } = await getPublicCatalog(business.id);
  const service = services.find((s) => s.id === parsed.data.serviceId);
  if (!service) return { ok: false, error: "Serviço indisponível." };
  if (
    parsed.data.staffId &&
    !staff.some((s) => s.id === parsed.data.staffId && s.serviceIds.includes(service.id))
  ) {
    return { ok: false, error: "Profissional indisponível." };
  }
  try {
    const data = await publicAvailability(business, {
      serviceId: service.id,
      durationMin: service.duration_min,
      staffId: parsed.data.staffId,
      from: parsed.data.from,
      date: parsed.data.date,
    });
    return { ok: true, data };
  } catch (e) {
    console.error("availabilityAction", e);
    return { ok: false, error: "Não foi possível carregar os horários. Tente de novo." };
  }
}
