"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { getDaySlots } from "@/lib/availability";
import {
  createAppointment,
  loadAvailabilityContext,
  registerAppointment,
  toBookingError,
} from "@/lib/booking";
import { afterBooking } from "@/lib/booking/after-booking";
import { requireBusinessFor } from "@/lib/business/current";
import { zonedDayRange } from "@/lib/dates";
import { normalizeMobile, onlyDigits } from "@/lib/phone";
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
  const business = await requireBusinessFor("appointments.manage_all");
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
  const business = await requireBusinessFor("appointments.manage_all");
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
  const business = await requireBusinessFor("appointments.manage_all");
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

const registerInput = z.object({
  serviceId: uuid,
  staffId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  /** Valor em centavos (pode diferir do preço do serviço). */
  priceCents: z.number().int().min(0).max(10_000_000),
  customerId: uuid.nullable(),
  customerName: z.string().trim().max(80).optional(),
  customerWhatsapp: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cash", "pix", "card", "other"]).nullable().optional(),
});

/** "Registrar atendimento": lança, já concluído, um atendimento de agora ou de antes. */
export async function registerAppointmentAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const business = await requireBusinessFor("appointments.manage_all");
  const parsed = registerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira os dados." };
  const v = parsed.data;
  if (v.customerWhatsapp && normalizeMobile(v.customerWhatsapp) === null)
    return { ok: false, error: "Confira o WhatsApp: DDD + celular com 9 dígitos." };
  if (!v.customerId && (v.customerName?.length ?? 0) < 2)
    return { ok: false, error: "Informe o nome do cliente." };
  const supabase = await createSupabaseServerClient();
  try {
    const r = await registerAppointment(supabase, {
      business,
      serviceId: v.serviceId,
      staffId: v.staffId,
      date: v.date,
      time: v.time,
      priceCents: v.priceCents,
      customerId: v.customerId,
      customer: v.customerId ? null : { name: v.customerName!, whatsapp: v.customerWhatsapp },
      notes: v.notes || null,
      paymentMethod: v.paymentMethod ?? null,
    });
    if ("error" in r) {
      const messages = {
        future: "Só dá para registrar atendimentos que já aconteceram. Para o futuro, use “Novo”.",
        overlap:
          "Esse profissional já tem um atendimento nesse horário. Ajuste a hora ou abra o atendimento existente.",
        invalid: "Confira o serviço, o profissional e o cliente.",
      };
      return { ok: false, error: messages[r.error] };
    }
    revalidatePath("/painel", "layout");
    return { ok: true, data: { id: r.id }, message: "Atendimento registrado." };
  } catch {
    return { ok: false, error: "Não foi possível registrar. Tente de novo." };
  }
}
