import { describe, expect, it } from "vitest";
import { accessRequestSchema, accessRequestsCsv } from "./requests";

describe("pedido de acesso (CAL-138)", () => {
  it("valida e normaliza", () => {
    const r = accessRequestSchema.safeParse({
      name: " Bia ",
      businessName: "Studio Bia",
      whatsapp: "(83) 9 8647-9932",
      segment: "",
      city: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({
        name: "Bia",
        whatsapp: "5583986479932",
        segment: null,
        city: null,
      });
    }
  });

  it("recusa WhatsApp inválido e segmento desconhecido", () => {
    const r = accessRequestSchema.safeParse({
      name: "Bia",
      businessName: "Studio",
      whatsapp: "123",
      segment: "nave-espacial",
    });
    expect(r.success).toBe(false);
  });

  it("CSV com BOM, ; e sem fórmulas", () => {
    const csv = accessRequestsCsv([
      {
        created_at: "2026-11-20T10:00:00Z",
        name: "=HYPERLINK(1)",
        business_name: 'Salão "Bela"; centro',
        whatsapp: "5583986479932",
        segment: "salao",
        city: null,
        status: "new",
      },
    ]);
    expect(csv.startsWith("﻿Data;Nome;")).toBe(true);
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain('"Salão ""Bela""; centro"');
    expect(csv).toContain("Salão de beleza");
    expect(csv).toContain("Novo");
  });
});
