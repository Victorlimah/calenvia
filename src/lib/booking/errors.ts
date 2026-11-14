import { isPgError, PG_EXCLUSION_VIOLATION } from "@/lib/supabase/errors";

export type BookingErrorCode =
  | "conflict"
  | "unavailable"
  | "invalid_service"
  | "invalid_staff"
  | "invalid_customer"
  | "business_unavailable"
  | "unknown";

export const BOOKING_MESSAGES: Record<BookingErrorCode, string> = {
  conflict: "Esse horário acabou de ser reservado. Escolha outro.",
  unavailable: "Esse horário não está mais disponível. Escolha outro.",
  invalid_service: "Esse serviço não está disponível.",
  invalid_staff: "Esse profissional não está disponível para o serviço.",
  invalid_customer: "Confira seu nome e WhatsApp.",
  business_unavailable: "A agenda deste negócio está indisponível no momento.",
  unknown: "Não foi possível concluir o agendamento. Tente de novo.",
};

export class BookingError extends Error {
  constructor(public readonly code: BookingErrorCode) {
    super(BOOKING_MESSAGES[code]);
    this.name = "BookingError";
  }
}

/** A constraint EXCLUDE do banco é a última barreira contra agendamento duplo. */
export function toBookingError(error: unknown): BookingError {
  if (error instanceof BookingError) return error;
  if (isPgError(error, PG_EXCLUSION_VIOLATION)) return new BookingError("conflict");
  return new BookingError("unknown");
}
