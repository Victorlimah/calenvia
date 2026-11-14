import type { PublicService, PublicStaff } from "@/lib/public/business";

export type FlowBusiness = {
  slug: string;
  name: string;
  accent: string;
  timezone: string;
  automaticMessages: boolean;
};

export type { PublicService, PublicStaff };

export const STEPS = ["servico", "profissional", "horario", "dados"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_TITLES: Record<Step, string> = {
  servico: "Escolha o serviço",
  profissional: "Com quem?",
  horario: "Escolha o dia e o horário",
  dados: "Seus dados",
};

/** Seleção do fluxo, guardada na URL. */
export type Selection = {
  serviceId: string | null;
  staffId: string | null; // null = sem preferência
  date: string | null; // YYYY-MM-DD
  start: string | null; // ISO
};
