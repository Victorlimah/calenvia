import "server-only";
import type { Tables } from "@/lib/supabase/types";

type Business = { id: string };
type Appointment = Tables<"appointments">;

/**
 * Ganchos depois de mudanças em agendamentos (mensagens de WhatsApp entram no CAL-068).
 * Erros aqui nunca desfazem o agendamento.
 */
/** Retorna se a confirmação foi enviada automaticamente (senão, o dono usa o wa.me). */
export async function afterBooking(
  business: Business,
  appointment: Appointment,
): Promise<{ automatic: boolean }> {
  void business;
  void appointment;
  return { automatic: false };
}

export async function afterCancel(
  business: Business,
  appointment: Appointment,
  options: { notifyCustomer: boolean },
): Promise<void> {
  void business;
  void appointment;
  void options;
}

export async function afterReschedule(business: Business, appointment: Appointment): Promise<void> {
  void business;
  void appointment;
}
