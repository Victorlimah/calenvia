import { describe, expect, it } from "vitest";
import { bookingSchema, customerSchema } from "./booking";

describe("dados do cliente", () => {
  it("aceita celular com máscara", () => {
    expect(customerSchema.safeParse({ name: "Ana", whatsapp: "(85) 9 9999-0000" }).success).toBe(
      true,
    );
  });
  it("recusa fixo e nome curto", () => {
    const r = customerSchema.safeParse({ name: "A", whatsapp: "(85) 3222-1111" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0]).sort()).toEqual(["name", "whatsapp"]);
  });
  it("campo-isca preenchido é recusado", () => {
    const base = {
      slug: "barbearia-do-ze",
      serviceId: "0c000000-0000-4000-8000-000000000001",
      staffId: null,
      start: "2026-11-20T12:00:00.000Z",
      name: "Ana",
      whatsapp: "85999990000",
    };
    expect(bookingSchema.safeParse(base).success).toBe(true);
    expect(bookingSchema.safeParse({ ...base, website: "http://spam" }).success).toBe(false);
  });
});
