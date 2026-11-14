import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";
import { sendWhatsApp, type SendBusiness, type SendResult } from "@/lib/whatsapp/send";
import type { TemplateKind } from "@/lib/whatsapp/templates";
import { transportFromEnv } from "@/lib/whatsapp/transport";

type Appointment = Pick<Tables<"appointments">, "id">;

/**
 * Ganchos depois de mudanças em agendamentos: mensagens automáticas de WhatsApp.
 * Erros aqui nunca desfazem o agendamento (o dono ainda tem o plano B pelo wa.me).
 * O envio usa o client service_role, porque `messages` e `message_usage` só são
 * gravados pelo servidor.
 */
async function notify(
  business: SendBusiness,
  appointment: Appointment,
  type: TemplateKind,
): Promise<SendResult | null> {
  try {
    const result = await sendWhatsApp(
      { db: createSupabaseAdminClient(), transport: transportFromEnv() },
      { business, appointmentId: appointment.id, type },
    );
    if (result.status === "failed") {
      console.error(`[whatsapp] ${type} falhou (${appointment.id}): ${result.error}`);
    }
    return result;
  } catch (e) {
    console.error(`[whatsapp] erro inesperado no envio de ${type}`, e);
    return null;
  }
}

/** Retorna se a confirmação foi enviada automaticamente (senão, o dono usa o wa.me). */
export async function afterBooking(
  business: SendBusiness,
  appointment: Appointment,
): Promise<{ automatic: boolean }> {
  const r = await notify(business, appointment, "confirmation");
  return { automatic: r?.status === "sent" };
}

export async function afterCancel(
  business: SendBusiness,
  appointment: Appointment,
  options: { notifyCustomer: boolean },
): Promise<void> {
  if (options.notifyCustomer) await notify(business, appointment, "cancellation");
}

/** Remarcação: o cliente recebe a confirmação com o novo horário. */
export async function afterReschedule(
  business: SendBusiness,
  appointment: Appointment,
): Promise<{ automatic: boolean }> {
  const r = await notify(business, appointment, "confirmation");
  return { automatic: r?.status === "sent" };
}
