import "server-only";
import type { Tables } from "@/lib/supabase/types";

/**
 * Passos depois de criar um agendamento pelo link (confirmação no WhatsApp etc.).
 * Os envios entram no CAL-068; erros aqui nunca desfazem o agendamento.
 */
export async function afterBooking(
  business: { id: string },
  appointment: Tables<"appointments">,
): Promise<void> {
  void business;
  void appointment;
}
