/**
 * Dados da página pública (CAL-144), já prontos para renderizar. Os mesmos dados alimentam a
 * página real (servidor) e a prévia do editor (navegador), então nada aqui é só do servidor.
 */
import type { PublicService, PublicStaff } from "@/lib/public/business";
import type { LogoPlacement } from "@/lib/themes/schema";

export type PageData = {
  name: string;
  slug: string;
  segment: string | null;
  segmentLabel: string;
  headline: string | null;
  subheadline: string | null;
  coverUrl: string | null;
  logo: { url: string | null; placements: LogoPlacement[] };
  address: string | null;
  addressReference: string | null;
  services: PublicService[];
  staff: PublicStaff[];
  photos: { id: string; url: string; caption: string | null }[];
  testimonials: { id: string; author_name: string; text: string; rating?: number }[];
  rating: { average: number | null; count: number };
  hours: { weekday: number; is_open: boolean; opens_at: string | null; closes_at: string | null }[];
  breaks: { weekday: number; starts_at: string; ends_at: string }[];
  todayWeekday: number;
  faq: { q: string; a: string }[];
  automaticMessages: boolean;
  /** Prévia do editor: links viram texto e nada fica fixo na tela. */
  preview?: boolean;
};
