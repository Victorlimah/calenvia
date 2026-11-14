"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { getDaySlots } from "@/lib/availability";
import { createAppointment, loadAvailabilityContext, toBookingError } from "@/lib/booking";
import { afterBooking } from "@/lib/booking/after-booking";
import { requireBusiness } from "@/lib/business/current";
import { zonedDayRange } from "@/lib/dates";
import { onlyDigits } from "@/lib/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerSchema } from "@/lib/validation/booking";
import { track } from "@/lib/metrics";

const uuid = z.string().uuid();

const slotsInput = z.object({
  serviceId: uuid,
  staffId: uuid.nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function manualSlotsAction(
  input: unknown,
): Promise<
  ActionResult<{ slots: { time: string; start: string; staffIds: string[] }[]; status: string }>
> {
  const business = await requireBusiness();
  const parsed = slotsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: service } = await supabase
    .from("services")
    .select("id, duration_min")
    .eq("id", parsed.data.serviceId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!service) return { ok: false, error: "Serviço não encontrado." };
  const day = zonedDayRange(parsed.data.date, business.timezone);
  const ctx = await loadAvailabilityContext(supabase, business, { from: day.start, to: day.end });
  ctx.minNoticeMin = 0;
  ctx.maxDaysAhead = 3650;
  const result = getDaySlots(ctx, {
    date: parsed.data.date,
    serviceId: service.id,
    durationMin: service.duration_min,
    staffId: parsed.data.staffId,
  });
  return {
    ok: true,
    data: {
      status: result.status,
      slots: result.slots.map((s) => ({
        time: s.time,
        start: s.start.toISOString(),
        staffIds: s.staffIds,
      })),
    },
  };
}

export type CustomerHit = { id: string; name: string; whatsapp: string };

export async function searchCustomersAction(query: string): Promise<CustomerHit[]> {
  const business = await requireBusiness();
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createSupabaseServerClient();
  const digits = onlyDigits(q);
  let req = supabase
    .from("customers")
    .select("id, name, whatsapp")
    .eq("business_id", business.id)
    .limit(8);
  req =
    digits.length >= 3
      ? req.like("whatsapp", `%${digits}%`)
      : req.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  const { data } = await req.order("name");
  return data ?? [];
}

const createInput = z
  .object({
    serviceId: uuid,
    staffId: uuid.nullable(),
    start: z.string().datetime({ offset: true }),
    customerId: uuid.nullable(),
    customer: customerSchema.nullable(),
    notes: z.string().trim().max(500).optional(),
    sendConfirmation: z.boolean().default(true),
    /** CAL-111: false = nenhuma mensagem automática para este agendamento. */
    messagesEnabled: z.boolean().default(true),
  })
  .refine((v) => v.customerId || v.customer, {
    message: "Escolha ou cadastre o cliente.",
    path: ["customer"],
  });

export async function createManualAppointmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; needsManualConfirmation: boolean }>> {
  const business = await requireBusiness();
  const parsed = createInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const supabase = await createSupabaseServerClient();
  let customer = parsed.data.customer;
  if (parsed.data.customerId) {
    const { data } = await supabase
      .from("customers")
      .select("name, whatsapp")
      .eq("id", parsed.data.customerId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "Cliente não encontrado." };
    customer = data;
  }
  try {
    const appointment = await createAppointment(supabase, {
      business,
      serviceId: parsed.data.serviceId,
      staffId: parsed.data.staffId,
      start: new Date(parsed.data.start),
      customer: customer!,
      source: "manual",
      notes: parsed.data.notes || null,
      ignoreNotice: true,
    });
    if (!parsed.data.messagesEnabled) {
      await supabase
        .from("appointments")
        .update({ messages_enabled: false })
        .eq("id", appointment.id)
        .eq("business_id", business.id);
    }
    const sent = parsed.data.sendConfirmation
      ? await afterBooking(business, appointment)
      : { automatic: false };
    await track("first_appointment", { businessId: business.id, props: { source: "manual" } });
    revalidatePath("/painel", "layout");
    return {
      ok: true,
      data: {
        id: appointment.id,
        needsManualConfirmation: parsed.data.sendConfirmation && !sent.automatic,
      },
      message: "Agendamento criado.",
    };
  } catch (e) {
    return { ok: false, error: toBookingError(e).message };
  }
}
