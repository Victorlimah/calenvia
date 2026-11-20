import type { SegmentId } from "./segments";

/**
 * Serviços iniciais sugeridos por segmento (CAL-136). Só nome e duração típicos: preço fica em
 * zero e o dono ajusta no onboarding. Nada de dados inventados do negócio.
 */
export type StarterService = { name: string; duration_min: number };

export const STARTER_SERVICES: Record<SegmentId, StarterService[]> = {
  barbearia: [
    { name: "Corte de cabelo", duration_min: 30 },
    { name: "Barba", duration_min: 30 },
    { name: "Corte e barba", duration_min: 60 },
  ],
  salao: [
    { name: "Corte feminino", duration_min: 60 },
    { name: "Escova", duration_min: 45 },
    { name: "Coloração", duration_min: 120 },
  ],
  manicure: [
    { name: "Manicure", duration_min: 45 },
    { name: "Pedicure", duration_min: 45 },
    { name: "Pé e mão", duration_min: 90 },
  ],
  estetica: [
    { name: "Limpeza de pele", duration_min: 60 },
    { name: "Drenagem linfática", duration_min: 60 },
  ],
  sobrancelha: [
    { name: "Design de sobrancelhas", duration_min: 30 },
    { name: "Extensão de cílios", duration_min: 120 },
  ],
  clinica: [
    { name: "Consulta", duration_min: 30 },
    { name: "Retorno", duration_min: 20 },
  ],
  psicologia: [{ name: "Sessão de terapia", duration_min: 50 }],
  fisioterapia: [
    { name: "Avaliação", duration_min: 60 },
    { name: "Sessão de fisioterapia", duration_min: 50 },
  ],
  personal: [
    { name: "Aula individual", duration_min: 60 },
    { name: "Avaliação física", duration_min: 45 },
  ],
  pilates: [
    { name: "Aula de pilates", duration_min: 50 },
    { name: "Aula experimental", duration_min: 50 },
  ],
  tatuagem: [
    { name: "Orçamento e conversa", duration_min: 30 },
    { name: "Sessão de tatuagem", duration_min: 180 },
  ],
  pet: [
    { name: "Banho", duration_min: 60 },
    { name: "Banho e tosa", duration_min: 90 },
  ],
  "lava-jato": [
    { name: "Lavagem simples", duration_min: 40 },
    { name: "Lavagem completa", duration_min: 90 },
  ],
  outro: [],
};

export function starterServicesFor(segment: string | null | undefined): StarterService[] {
  return STARTER_SERVICES[segment as SegmentId] ?? [];
}
