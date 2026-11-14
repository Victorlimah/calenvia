import { messageFor } from "@/lib/messages/custom";
import type { MessageVars } from "@/lib/messages/templates";
import { waMeLink } from "@/lib/phone";

/**
 * Plano B (CAL-072): quando não há envio automático (plano Básico, sem cota ou erro),
 * o dono abre o WhatsApp com a mensagem pronta para o cliente.
 */
/** texts: textos personalizados do negócio (businesses.message_texts, CAL-074). */
export function confirmationWaLink(
  customerWhatsapp: string,
  vars: MessageVars,
  texts?: unknown,
): string {
  return waMeLink(customerWhatsapp, messageFor("confirmation", texts, vars));
}

export function reminderWaLink(
  customerWhatsapp: string,
  vars: MessageVars,
  texts?: unknown,
): string {
  return waMeLink(customerWhatsapp, messageFor("reminder", texts, vars));
}

/** Template usado para registrar em `messages` um envio manual pelo wa.me. */
export const MANUAL_TEMPLATE = "wa.me";
