"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { rescheduleAppointment, rescheduleSlots, toBookingError } from "@/lib/booking";
import { afterCancel, afterReschedule } from "@/lib/booking/after-booking";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const id = z.string().uuid();

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: "confirmed" | "completed" | "no_show",
): Promise<ActionResult> {
  const business = await requireBusiness();
  if (
    !id.safeParse(appointmentId).success ||
    !["confirmed", "completed", "no_show"].includes(status)
  ) {
    return { ok: false, error: "Pedido inválido." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status, canceled_at: null })
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .neq("status", "canceled")
    .select("customer_id, starts_at")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível atualizar." };
  if (status === "completed") {
    const { data: customer } = await supabase
      .from("customers")
      .select("last_visit_at")
      .eq("id", data.customer_id)
      .maybeSingle();
    if (!customer?.last_visit_at || customer.last_visit_at < data.starts_at) {
      await supabase
        .from("customers")
        .update({ last_visit_at: data.starts_at })
        .eq("id", data.customer_id);
    }
  }
  revalidatePath("/painel", "layout");
  const messages = {
    confirmed: "Marcado como confirmado.",
    completed: "Marcado como concluído.",
    no_show: "Marcado como falta.",
  };
  return { ok: true, message: messages[status] };
}

export async function cancelAppointmentAction(appointmentId: string): Promise<ActionResult> {
  const business = await requireBusiness();
  if (!id.safeParse(appointmentId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .neq("status", "canceled")
    .select("*")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível cancelar." };
  await afterCancel(business, data, { notifyCustomer: true });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Agendamento cancelado. O horário ficou livre." };
}

const slotsInput = z.object({
  appointmentId: id,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffId: id.nullable(),
});

export async function rescheduleSlotsAction(
  input: unknown,
): Promise<
  ActionResult<{ slots: { time: string; start: string; staffIds: string[] }[]; status: string }>
> {
  const business = await requireBusiness();
  const parsed = slotsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  try {
    const day = await rescheduleSlots(supabase, business, { ...parsed.data, ignoreNotice: true });
    return {
      ok: true,
      data: {
        status: day.status,
        slots: day.slots
          .filter((s) => s.start.getTime() > Date.now())
          .map((s) => ({ time: s.time, start: s.start.toISOString(), staffIds: s.staffIds })),
      },
    };
  } catch (e) {
    return { ok: false, error: toBookingError(e).message };
  }
}

const rescheduleInput = z.object({
  appointmentId: id,
  start: z.string().datetime({ offset: true }),
  staffId: id.nullable(),
});

export async function rescheduleAppointmentAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = rescheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  try {
    const updated = await rescheduleAppointment(supabase, business, {
      appointmentId: parsed.data.appointmentId,
      start: new Date(parsed.data.start),
      staffId: parsed.data.staffId,
      ignoreNotice: true,
    });
    await afterReschedule(business, updated);
    revalidatePath("/painel", "layout");
    return { ok: true, message: "Agendamento remarcado." };
  } catch (e) {
    return { ok: false, error: toBookingError(e).message };
  }
}
