/** Quantos horários futuros um mesmo WhatsApp pode ter num negócio pelo link (anti-spam). */
export const MAX_FUTURE_BOOKINGS_PER_CUSTOMER = 3;

export const TOO_MANY_BOOKINGS_MESSAGE = `Você já tem ${MAX_FUTURE_BOOKINGS_PER_CUSTOMER} horários marcados aqui. Para marcar mais, fale com o negócio pelo WhatsApp.`;
