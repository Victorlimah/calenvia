import "server-only";
import { z } from "zod";
import { isBookingOpen } from "@/lib/plans";
import { getPublicAppointment } from "@/lib/public/appointment";
import { publicAvailability, type PublicAvailability } from "@/lib/public/availability";
import { getPublicBusiness, getPublicCatalog } from "@/lib/public/business";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export type AvailabilityResult =
  { ok: true; data: PublicAvailability } | { ok: false; error: string };

/**
 * Horários livres para o fluxo público (validação + limite por IP + motor). Usado pela rota
 * GET /api/disponibilidade (o navegador busca por fetch, fora da fila de server actions do
 * roteador) e pela action availabilityAction.
 */
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
  manageCode: z.string().max(10).nullable().optional(),
});

export async function queryPublicAvailability(
  input: unknown,
  ip?: string,
): Promise<AvailabilityResult> {
  const parsed = availabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  if (!(await checkRateLimit("availability", ip))) return { ok: false, error: RATE_LIMIT_MESSAGE };
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
  let excludeAppointmentId: string | null = null;
  if (parsed.data.manageCode) {
    const appt = await getPublicAppointment(business.id, parsed.data.manageCode);
    if (!appt) return { ok: false, error: "Agendamento não encontrado." };
    excludeAppointmentId = appt.id;
  }
  try {
    const data = await publicAvailability(business, {
      excludeAppointmentId,
      serviceId: service.id,
      durationMin: service.duration_min,
      staffId: parsed.data.staffId,
      from: parsed.data.from,
      date: parsed.data.date,
    });
    return { ok: true, data };
  } catch (e) {
    console.error("queryPublicAvailability", e);
    return { ok: false, error: "Não foi possível carregar os horários. Tente de novo." };
  }
}
