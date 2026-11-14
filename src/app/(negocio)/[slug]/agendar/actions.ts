"use server";

import { z } from "zod";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness, getPublicCatalog } from "@/lib/public/business";
import { publicAvailability, type PublicAvailability } from "@/lib/public/availability";
import { isBookingOpen } from "@/lib/plans";
import { zodFieldErrors } from "@/lib/action-result";
import {
  BOOKING_MESSAGES,
  createAppointment,
  toBookingError,
  type BookingErrorCode,
} from "@/lib/booking";
import { afterBooking } from "@/lib/booking/after-booking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bookingSchema } from "@/lib/validation/booking";

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
    console.error("availabilityAction", e);
    return { ok: false, error: "Não foi possível carregar os horários. Tente de novo." };
  }
}

export type BookResult =
  | { ok: true; code: string }
  | { ok: false; error: string; code?: BookingErrorCode; fieldErrors?: Record<string, string> };

export async function bookAction(input: unknown): Promise<BookResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Confira seus dados.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const business = await getPublicBusiness(data.slug);
  if (!business || !isBookingOpen(business)) {
    return {
      ok: false,
      error: BOOKING_MESSAGES.business_unavailable,
      code: "business_unavailable",
    };
  }
  try {
    const appointment = await createAppointment(createSupabaseAdminClient(), {
      business,
      serviceId: data.serviceId,
      staffId: data.staffId,
      start: new Date(data.start),
      customer: { name: data.name, whatsapp: data.whatsapp },
      source: "link",
    });
    await afterBooking(business, appointment);
    return { ok: true, code: appointment.manage_code };
  } catch (e) {
    const err = toBookingError(e);
    return { ok: false, error: err.message, code: err.code };
  }
}
