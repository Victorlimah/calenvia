/**
 * Filtros da lista de negócios do admin (CAL-130). Funções puras, testadas em directory.test.ts.
 */
import { PLAN_ORDER } from "@/lib/plans";
import { SEGMENT_IDS } from "@/lib/business/segments";
import { PLAN_STATUSES } from "./business-update";

export const DIRECTORY_SORTS = [
  { key: "recentes", label: "Cadastro mais recente" },
  { key: "nome", label: "Nome (A–Z)" },
  { key: "valor", label: "Maior valor/mês" },
  { key: "agendamentos", label: "Mais agendamentos no mês" },
  { key: "acesso", label: "Último acesso" },
] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number]["key"];

export type DirectoryFilters = {
  q: string;
  plan: string | null;
  status: string | null;
  segment: string | null;
  city: string;
  sort: DirectorySort;
  page: number;
};

export const DIRECTORY_PAGE_SIZE = 25;

export function parseDirectoryFilters(sp: Record<string, string | undefined>): DirectoryFilters {
  const pick = <T extends string>(v: string | undefined, list: readonly T[]) =>
    v && (list as readonly string[]).includes(v) ? (v as T) : null;
  return {
    q: (sp.q ?? "").trim().slice(0, 100),
    plan: pick(sp.plano, PLAN_ORDER),
    status: pick(sp.status, PLAN_STATUSES),
    segment: pick(sp.segmento, SEGMENT_IDS),
    city: (sp.cidade ?? "").trim().slice(0, 60),
    sort:
      pick(
        sp.ordem,
        DIRECTORY_SORTS.map((s) => s.key),
      ) ?? "recentes",
    page: Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1),
  };
}

/** Link da lista com os filtros (e a página); omite o que está no padrão. */
export function directoryHref(f: DirectoryFilters, patch: Partial<DirectoryFilters> = {}): string {
  const v = { ...f, ...patch };
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  if (v.plan) p.set("plano", v.plan);
  if (v.status) p.set("status", v.status);
  if (v.segment) p.set("segmento", v.segment);
  if (v.city) p.set("cidade", v.city);
  if (v.sort !== "recentes") p.set("ordem", v.sort);
  if (v.page > 1) p.set("pagina", String(v.page));
  const s = p.toString();
  return s ? `/admin?${s}` : "/admin";
}

/** "há 3 dias", "hoje", "nunca" (último acesso). */
export function lastAccessLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Nunca entrou";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Há 1 mês" : `Há ${months} meses`;
}
