/** Avaliações (CAL-106). */
import { businessUrl } from "@/lib/hosts";

/** Prazo para o cliente avaliar depois do atendimento. */
export const REVIEW_WINDOW_DAYS = 30;

export function canReview(
  a: { status: string; start: Date },
  alreadyReviewed: boolean,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: "not_done" | "reviewed" | "too_late" } {
  if (alreadyReviewed) return { ok: false, reason: "reviewed" };
  if (a.status !== "completed") return { ok: false, reason: "not_done" };
  if (now.getTime() - a.start.getTime() > REVIEW_WINDOW_DAYS * 86400000)
    return { ok: false, reason: "too_late" };
  return { ok: true };
}

export function reviewLink(slug: string, code: string): string {
  return businessUrl(slug, `/avaliar/${code}`);
}

export function reviewRequestText(b: { name: string }, customerName: string, link: string) {
  const first = customerName.trim().split(/\s+/)[0];
  return `Olá, ${first}! Obrigado por vir à *${b.name}*. Como foi o atendimento? Leva 10 segundos para avaliar: ${link}`;
}

/** Nota média com 1 casa (ou null) e contagem. */
export function ratingSummary(ratings: number[]) {
  if (!ratings.length) return { average: null as number | null, count: 0 };
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  return { average: Math.round(avg * 10) / 10, count: ratings.length };
}

/** Nome para exibir publicamente: primeiro nome + inicial do sobrenome. */
export function publicAuthorName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)![0].toUpperCase()}.` : parts[0];
}
