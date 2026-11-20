import { normalizePhone, waMeLink } from "@/lib/phone";

/** WhatsApp da Calenvia (pedido de acesso, convite expirado). `NEXT_PUBLIC_SUPPORT_WHATSAPP`. */
export const DEFAULT_SUPPORT_WHATSAPP = "5583986479932";

export function supportWhatsApp(
  value: string | undefined = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
): string {
  return normalizePhone(value) ?? DEFAULT_SUPPORT_WHATSAPP;
}

export const REQUEST_ACCESS_TEXT =
  "Olá! Quero conhecer a Calenvia e pedir acesso para o meu negócio.";

export const EXPIRED_INVITE_TEXT =
  "Olá! Meu convite da Calenvia expirou. Pode me mandar um novo link?";

/** Link `wa.me` para falar com a Calenvia, com a mensagem pronta. */
export function supportWaLink(text: string = REQUEST_ACCESS_TEXT): string {
  return waMeLink(supportWhatsApp(), text);
}
