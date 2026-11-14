import { describe, expect, it } from "vitest";
import { newBookingText, shouldNotify } from "./new-booking";

const e = {
  id: "1",
  source: "link",
  status: "confirmed",
  customer_name: "Lucas",
  starts_at: "2026-11-20T17:30:00Z",
};

describe("aviso de novo agendamento", () => {
  it("só avisa agendamentos feitos pelo cliente na página", () => {
    expect(shouldNotify(e)).toBe(true);
    expect(shouldNotify({ ...e, source: "manual" })).toBe(false);
    expect(shouldNotify({ ...e, status: "canceled" })).toBe(false);
  });

  it("texto com nome, dia e hora no fuso do negócio", () => {
    const t = newBookingText(e, "America/Fortaleza", new Date("2026-11-18T12:00:00Z"));
    expect(t.title).toBe("Novo agendamento");
    expect(t.body).toMatch(/^Lucas · .+ às 14:30$/);
  });

  it("diz 'hoje' quando é no mesmo dia", () => {
    const t = newBookingText(e, "America/Fortaleza", new Date("2026-11-20T11:00:00Z"));
    expect(t.body).toBe("Lucas · hoje às 14:30");
  });
});
