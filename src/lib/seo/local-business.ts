/** Dados estruturados schema.org do negócio (CAL-054), para resultados ricos no Google. */
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function localBusinessJsonLd(b: {
  name: string;
  url: string;
  image?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  description?: string | null;
  hours: { weekday: number; is_open: boolean; opens_at: string | null; closes_at: string | null }[];
  services: { name: string; price_cents: number }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    url: b.url,
    ...(b.image ? { image: b.image } : {}),
    ...(b.description ? { description: b.description } : {}),
    ...(b.address
      ? { address: { "@type": "PostalAddress", streetAddress: b.address, addressCountry: "BR" } }
      : {}),
    ...(b.whatsapp ? { telephone: `+${b.whatsapp}` } : {}),
    openingHoursSpecification: b.hours
      .filter((h) => h.is_open && h.opens_at && h.closes_at)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAYS[h.weekday]}`,
        opens: h.opens_at!.slice(0, 5),
        closes: h.closes_at!.slice(0, 5),
      })),
    makesOffer: b.services.slice(0, 20).map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.name },
      ...(s.price_cents ? { price: (s.price_cents / 100).toFixed(2), priceCurrency: "BRL" } : {}),
    })),
    potentialAction: {
      "@type": "ReserveAction",
      target: `${b.url.replace(/\/$/, "")}/agendar`,
    },
  };
}

/** JSON seguro para <script type="application/ld+json"> (evita fechar a tag). */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
