import { confirmationText, reminderText, type MessageVars } from "@/lib/messages/templates";
import { waMeLink } from "@/lib/phone";

/**
 * Plano B (CAL-072): quando não há envio automático (plano Básico, sem cota ou erro),
 * o dono abre o WhatsApp com a mensagem pronta para o cliente.
 */
export function confirmationWaLink(customerWhatsapp: string, vars: MessageVars): string {
  return waMeLink(customerWhatsapp, confirmationText(vars));
}

export function reminderWaLink(customerWhatsapp: string, vars: MessageVars): string {
  return waMeLink(customerWhatsapp, reminderText(vars));
}

/** Template usado para registrar em `messages` um envio manual pelo wa.me. */
export const MANUAL_TEMPLATE = "wa.me";
