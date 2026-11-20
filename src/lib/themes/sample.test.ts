import { describe, expect, it } from "vitest";
import type { PageData } from "@/components/negocio/page-data";
import { needsSample, withSampleData } from "./sample";

const base: PageData = {
  name: "Bela Nails",
  slug: "bela",
  segment: "manicure",
  segmentLabel: "Manicure e pedicure",
  headline: null,
  subheadline: null,
  coverUrl: null,
  logo: { url: null, placements: ["hero"] },
  address: null,
  addressReference: null,
  services: [],
  staff: [],
  photos: [],
  testimonials: [],
  rating: { average: null, count: 0 },
  hours: [],
  breaks: [],
  todayWeekday: 1,
  faq: [],
  automaticMessages: false,
};

describe("dados de exemplo da prévia (CAL-148)", () => {
  it("negócio recém-convidado ganha serviços do segmento e equipe de exemplo, mantendo o nome", () => {
    expect(needsSample(base)).toBe(true);
    const d = withSampleData(base);
    expect(d.name).toBe("Bela Nails");
    expect(d.services.map((s) => s.name)).toContain("Manicure");
    expect(d.staff).toHaveLength(2);
    expect(d.testimonials.length).toBeGreaterThan(0);
  });

  it("quem já tem serviço ou equipe vê só os próprios dados", () => {
    const real = {
      ...base,
      services: [
        {
          id: "s",
          name: "Pé",
          description: null,
          duration_min: 30,
          price_cents: 1,
          is_featured: false,
        },
      ],
    };
    expect(needsSample(real)).toBe(false);
    expect(withSampleData(real)).toBe(real);
  });

  it("segmento sem catálogo usa serviços genéricos", () => {
    expect(withSampleData({ ...base, segment: "outro" }).services.length).toBe(2);
  });
});
