/**
 * Dados de exemplo da prévia (CAL-148): para quem ainda não cadastrou serviços nem equipe.
 * Serviços do segmento (sem inventar o negócio da pessoa: o nome real é mantido se existir).
 */
import type { PageData } from "@/components/negocio/page-data";
import { starterServicesFor } from "@/lib/business/starter-services";

export const SAMPLE_NAME = "Studio Exemplo";

/** Precisa de exemplo? Só quando não há serviço nem profissional. */
export function needsSample(data: Pick<PageData, "services" | "staff">): boolean {
  return data.services.length === 0 && data.staff.length === 0;
}

/** Completa os dados com serviços, equipe e depoimentos de exemplo do segmento. */
export function withSampleData(data: PageData): PageData {
  if (!needsSample(data)) return data;
  const starters = starterServicesFor(data.segment);
  const list = starters.length
    ? starters
    : [
        { name: "Atendimento", duration_min: 60 },
        { name: "Retorno", duration_min: 30 },
      ];
  return {
    ...data,
    name: data.name || SAMPLE_NAME,
    services: list.map((s, i) => ({
      id: `exemplo-${i}`,
      name: s.name,
      description: null,
      duration_min: s.duration_min,
      price_cents: 5000 + i * 2500,
      is_featured: i === 0,
    })),
    staff: [
      { id: "exemplo-a", name: "Ana Souza", role: "Profissional", photo_url: null, serviceIds: [] },
      {
        id: "exemplo-b",
        name: "Bruno Lima",
        role: "Profissional",
        photo_url: null,
        serviceIds: [],
      },
    ],
    testimonials: data.testimonials.length
      ? data.testimonials
      : [
          {
            id: "exemplo-t1",
            author_name: "Carla M.",
            text: "Atendimento impecável, voltarei!",
            rating: 5,
          },
          {
            id: "exemplo-t2",
            author_name: "Diego R.",
            text: "Agendei em um minuto pelo celular.",
            rating: 5,
          },
        ],
  };
}
