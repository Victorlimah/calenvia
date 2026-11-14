"use server";

import { z } from "zod";
import { getPublicBusiness, getPublicCatalog } from "@/lib/public/business";
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
import { track } from "@/lib/metrics";
import { headers } from "next/headers";
import { verifyCaptcha } from "@/lib/captcha";
import { MAX_FUTURE_BOOKINGS_PER_CUSTOMER, TOO_MANY_BOOKINGS_MESSAGE } from "@/lib/booking/limits";
import { normalizeMobile } from "@/lib/phone";
import { checkRateLimit, clientIp, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { addLocalDays, todayIn } from "@/lib/dates";
import { queryPublicAvailability, type AvailabilityResult } from "@/lib/public/availability-query";

export async function availabilityAction(input: unknown): Promise<AvailabilityResult> {
  return queryPublicAvailability(input);
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
  const ip = clientIp(await headers());
  if (!(await checkRateLimit("book", ip))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  if (!(await verifyCaptcha(data.captchaToken, ip))) {
    return { ok: false, error: "Não conseguimos confirmar que você não é um robô. Tente de novo." };
  }
  const business = await getPublicBusiness(data.slug);
  if (!business || !isBookingOpen(business)) {
    return {
      ok: false,
      error: BOOKING_MESSAGES.business_unavailable,
      code: "business_unavailable",
    };
  }
  const phone = normalizeMobile(data.whatsapp);
  const db = createSupabaseAdminClient();
  const { count: future } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("customer_whatsapp", phone ?? "")
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString());
  if ((future ?? 0) >= MAX_FUTURE_BOOKINGS_PER_CUSTOMER) {
    return { ok: false, error: TOO_MANY_BOOKINGS_MESSAGE };
  }
  try {
    const appointment = await createAppointment(db, {
      business,
      serviceId: data.serviceId,
      staffId: data.staffId,
      start: new Date(data.start),
      customer: { name: data.name, whatsapp: data.whatsapp },
      source: "link",
    });
    await afterBooking(business, appointment);
    await track("first_appointment", { businessId: business.id, props: { source: "link" } });
    return { ok: true, code: appointment.manage_code };
  } catch (e) {
    const err = toBookingError(e);
    return { ok: false, error: err.message, code: err.code };
  }
}

const waitlistInput = z.object({
  slug: z.string().min(3).max(40),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o dia."),
  period: z.enum(["any", "morning", "afternoon", "evening"]),
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  whatsapp: z.string().trim().min(1, "Informe seu WhatsApp."),
});

/** Lista de espera (CAL-104): o cliente pede para ser avisado se abrir vaga no dia. */
export async function joinWaitlistAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = waitlistInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  if (!(await checkRateLimit("book"))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const phone = normalizeMobile(parsed.data.whatsapp);
  if (!phone) return { ok: false, error: "Confira o número: DDD + celular com 9 dígitos." };
  const business = await getPublicBusiness(parsed.data.slug);
  if (!business || !isBookingOpen(business)) return { ok: false, error: "Agenda indisponível." };
  const today = todayIn(business.timezone);
  if (parsed.data.date < today || parsed.data.date > addLocalDays(today, business.max_days_ahead)) {
    return { ok: false, error: "Escolha um dia dentro da agenda." };
  }
  const { services } = await getPublicCatalog(business.id);
  if (!services.some((s) => s.id === parsed.data.serviceId)) {
    return { ok: false, error: "Serviço indisponível." };
  }
  const { error } = await createSupabaseAdminClient().from("waitlist_entries").upsert(
    {
      business_id: business.id,
      service_id: parsed.data.serviceId,
      staff_member_id: parsed.data.staffId,
      desired_date: parsed.data.date,
      period: parsed.data.period,
      customer_name: parsed.data.name,
      customer_whatsapp: phone,
      status: "waiting",
    },
    { onConflict: "business_id,desired_date,service_id,customer_whatsapp" },
  );
  if (error) return { ok: false, error: "Não foi possível entrar na lista. Tente de novo." };
  return { ok: true };
}
