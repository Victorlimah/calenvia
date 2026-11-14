import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "@/lib/dates";
import { confirmationWaLink } from "./wa-link";

describe("plano B pelo wa.me", () => {
  it("abre a conversa com o cliente e a confirmação pronta", () => {
    const link = confirmationWaLink("5585999110001", {
      customerName: "Lucas",
      businessName: "Barbearia do Zé",
      serviceName: "Corte",
      staffName: "Zé",
      start: localDateTimeToUtc("2026-11-21", "09:00", "America/Fortaleza"),
      timezone: "America/Fortaleza",
      link: "https://barbearia-do-ze.calenvia.com.br/",
    });
    expect(link.startsWith("https://wa.me/5585999110001?text=")).toBe(true);
    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("Olá, Lucas! Aqui é da *Barbearia do Zé*");
    expect(text).toContain("*sábado, 21/11 às 09:00*");
  });
});
