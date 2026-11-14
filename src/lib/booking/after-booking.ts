import "server-only";
import type { Tables } from "@/lib/supabase/types";

type Business = { id: string };
type Appointment = Tables<"appointments">;

/**
 * Ganchos depois de mudanças em agendamentos (mensagens de WhatsApp entram no CAL-068).
 * Erros aqui nunca desfazem o agendamento.
 */
export async function afterBooking(business: Business, appointment: Appointment): Promise<void> {
  void business;
  void appointment;
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
