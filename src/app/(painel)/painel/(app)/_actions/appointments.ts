"use server";

import { APPOINTMENT_COLUMNS } from "@/lib/appointments/columns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { rescheduleAppointment, rescheduleSlots, toBookingError } from "@/lib/booking";
import { afterCancel, afterReschedule } from "@/lib/booking/after-booking";
import { requireBusinessFor, requireWritableMember } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const id = z.string().uuid();

export async function setAppointmentStatusAction(
  appointmentId: string,
  status: "confirmed" | "completed" | "no_show",
): Promise<ActionResult> {
  await requireWritableMember();
  if (
    !id.safeParse(appointmentId).success ||
    !["confirmed", "completed", "no_show"].includes(status)
  ) {
    return { ok: false, error: "Pedido inválido." };
  }
  const supabase = await createSupabaseServerClient();
  // A função no banco checa o papel: quem agenda para todos, ou o profissional nos próprios
  // atendimentos (CAL-112). Também atualiza a última visita do cliente.
  const { error } = await supabase.rpc("set_appointment_status", {
    p_appointment_id: appointmentId,
    p_status: status,
  });
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/painel", "layout");
  const messages = {
    confirmed: "Marcado como confirmado.",
    completed: "Marcado como concluído.",
    no_show: "Marcado como falta.",
  };
  return { ok: true, message: messages[status] };
}

/** Forma de pagamento do atendimento concluído (CAL-128). null = não informado. */
export async function setAppointmentPaymentAction(
  appointmentId: string,
  method: "cash" | "pix" | "card" | "other" | null,
): Promise<ActionResult> {
  await requireWritableMember();
  if (
    !id.safeParse(appointmentId).success ||
    (method !== null && !["cash", "pix", "card", "other"].includes(method))
  ) {
    return { ok: false, error: "Pedido inválido." };
  }
  const supabase = await createSupabaseServerClient();
  // A função no banco aplica a mesma regra do status (CAL-112).
  const { error } = await supabase.rpc("set_appointment_payment", {
    p_appointment_id: appointmentId,
    p_method: method as string,
  });
  if (error) return { ok: false, error: "Não foi possível salvar a forma de pagamento." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Forma de pagamento salva." };
}

export async function cancelAppointmentAction(appointmentId: string): Promise<ActionResult> {
  const business = await requireBusinessFor("appointments.manage_all");
  if (!id.safeParse(appointmentId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .neq("status", "canceled")
    .select(APPOINTMENT_COLUMNS)
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
  const business = await requireBusinessFor("appointments.manage_all");
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
  const business = await requireBusinessFor("appointments.manage_all");
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
