import { describe, expect, it } from "vitest";
import { BookingError, toBookingError } from "./errors";

describe("erros de agendamento", () => {
  it("violação da constraint vira mensagem amigável", () => {
    const e = toBookingError({
      code: "23P01",
      message: "conflicting key value violates exclusion constraint",
    });
    expect(e.code).toBe("conflict");
    expect(e.message).toBe("Esse horário acabou de ser reservado. Escolha outro.");
  });
  it("mantém BookingError e trata o resto como desconhecido", () => {
    expect(toBookingError(new BookingError("invalid_service")).code).toBe("invalid_service");
    expect(toBookingError(new Error("x")).code).toBe("unknown");
  });
});
