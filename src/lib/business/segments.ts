export const SEGMENTS = [
  { id: "barbearia", label: "Barbearia" },
  { id: "salao", label: "Salão de beleza" },
  { id: "manicure", label: "Manicure e pedicure" },
  { id: "estetica", label: "Estética" },
  { id: "sobrancelha", label: "Sobrancelhas e cílios" },
  { id: "clinica", label: "Clínica ou consultório" },
  { id: "psicologia", label: "Psicologia" },
  { id: "fisioterapia", label: "Fisioterapia" },
  { id: "personal", label: "Personal trainer" },
  { id: "pilates", label: "Studio de pilates" },
  { id: "tatuagem", label: "Estúdio de tatuagem" },
  { id: "pet", label: "Pet shop" },
  { id: "lava-jato", label: "Lava-jato" },
  { id: "outro", label: "Outro" },
] as const;

export type SegmentId = (typeof SEGMENTS)[number]["id"];

export const SEGMENT_IDS = SEGMENTS.map((s) => s.id) as [SegmentId, ...SegmentId[]];

export function segmentLabel(id: string | null | undefined): string {
  return SEGMENTS.find((s) => s.id === id)?.label ?? "Negócio";
}

export const TIMEZONES = [
  { id: "America/Sao_Paulo", label: "Horário de Brasília (maior parte do país)" },
  { id: "America/Manaus", label: "Amazonas, Rondônia, Roraima, MT e MS (−1h)" },
  { id: "America/Rio_Branco", label: "Acre (−2h)" },
  { id: "America/Noronha", label: "Fernando de Noronha (+1h)" },
] as const;

export const TIMEZONE_IDS = TIMEZONES.map((t) => t.id) as [string, ...string[]];

/** Para fusos já salvos que não estão na lista (ex.: America/Fortaleza), mostramos o próprio id. */
export function timezoneOptions(current?: string | null) {
  const list: { id: string; label: string }[] = [...TIMEZONES];
  if (current && !list.some((t) => t.id === current)) list.unshift({ id: current, label: current });
  return list;
}
