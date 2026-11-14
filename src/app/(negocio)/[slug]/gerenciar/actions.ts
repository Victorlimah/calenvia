"use server";

import { z } from "zod";
import { rescheduleAppointment, toBookingError } from "@/lib/booking";
import { afterCancel, afterReschedule } from "@/lib/booking/after-booking";
import { customerManagePolicy, type ManageBlockReason } from "@/lib/booking/manage-policy";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ManageResult = { ok: true } | { ok: false; error: string };

const base = z.object({ slug: z.string().min(3).max(40), code: z.string().min(6).max(10) });

const BLOCKED: Record<ManageBlockReason, string> = {
  plan: "Para remarcar ou cancelar, fale com o negócio pelo WhatsApp.",
  canceled: "Este agendamento já foi cancelado.",
  past: "Este horário já passou.",
  done: "Este agendamento já foi atendido.",
  deadline: "O prazo para remarcar ou cancelar pelo link já passou. Fale com o negócio.",
};

/** Carrega e confere tudo de novo no servidor (nunca confia no que a página mostrou). */
async function load(input: unknown) {
  const parsed = base.safeParse(input);
  if (!parsed.success) return { error: "Pedido inválido." } as const;
  const business = await getPublicBusiness(parsed.data.slug);
  if (!business) return { error: "Negócio não encontrado." } as const;
  const appt = await getPublicAppointment(business.id, parsed.data.code);
  if (!appt) return { error: "Agendamento não encontrado." } as const;
  const policy = customerManagePolicy(business, appt);
  if (!policy.ok) return { error: BLOCKED[policy.reason] } as const;
  return { business, appt } as const;
}

export async function cancelByCodeAction(input: unknown): Promise<ManageResult> {
  const r = await load(input);
  if ("error" in r) return { ok: false, error: r.error! };
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("appointments")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", r.appt.id)
    .eq("business_id", r.business.id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível cancelar. Tente de novo." };
  await afterCancel(r.business, data, { notifyCustomer: true });
  return { ok: true };
}

const rescheduleInput = base.extend({ start: z.string().datetime({ offset: true }) });

export async function rescheduleByCodeAction(input: unknown): Promise<ManageResult> {
  const parsed = rescheduleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Escolha um horário." };
  const r = await load(parsed.data);
  if ("error" in r) return { ok: false, error: r.error! };
  try {
    const updated = await rescheduleAppointment(createSupabaseAdminClient(), r.business, {
      appointmentId: r.appt.id,
      start: new Date(parsed.data.start),
      staffId: r.appt.staffId, // o cliente remarca com o mesmo profissional
    });
    await afterReschedule(r.business, updated);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: toBookingError(e).message };
  }
}
