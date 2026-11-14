import { describe, expect, it } from "vitest";
import { jsonLdString, localBusinessJsonLd } from "./local-business";

describe("JSON-LD do negócio", () => {
  const ld = localBusinessJsonLd({
    name: "Barbearia do Zé",
    url: "https://barbearia-do-ze.calenvia.com.br/",
    address: "Rua A, 1",
    whatsapp: "5585988887777",
    hours: [
      { weekday: 1, is_open: true, opens_at: "09:00:00", closes_at: "19:00:00" },
      { weekday: 0, is_open: false, opens_at: null, closes_at: null },
    ],
    services: [{ name: "Corte", price_cents: 4000 }],
  });

  it("monta LocalBusiness com horários, ofertas e ação de reserva", () => {
    expect(ld).toMatchObject({
      "@type": "LocalBusiness",
      telephone: "+5585988887777",
      openingHoursSpecification: [
        { dayOfWeek: "https://schema.org/Monday", opens: "09:00", closes: "19:00" },
      ],
      makesOffer: [{ itemOffered: { name: "Corte" }, price: "40.00", priceCurrency: "BRL" }],
      potentialAction: { target: "https://barbearia-do-ze.calenvia.com.br/agendar" },
    });
  });

  it("escapa < para não fechar o script", () => {
    expect(jsonLdString({ n: "</script>" })).toBe('{"n":"\\u003c/script>"}');
  });
});
