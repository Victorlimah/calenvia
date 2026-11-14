import { isReservedSlug, isSlugShape } from "./hosts";

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

/** "Barbearia do Zé!" → "barbearia-do-ze" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-$/, "");
}

/** Mensagem de erro em pt-BR, ou null se o slug é válido (sem checar se já existe). */
export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Use pelo menos ${SLUG_MIN} caracteres.`;
  if (slug.length > SLUG_MAX) return `Use no máximo ${SLUG_MAX} caracteres.`;
  if (/[A-Z]/.test(slug)) return "Use só letras minúsculas.";
  if (!/^[a-z0-9-]+$/.test(slug)) return "Use só letras sem acento, números e hífen.";
  if (slug.startsWith("-") || slug.endsWith("-")) return "Não comece nem termine com hífen.";
  if (slug.includes("--")) return "Não use dois hífens seguidos.";
  if (isReservedSlug(slug)) return "Esse endereço é reservado. Escolha outro.";
  if (!isSlugShape(slug)) return "Endereço inválido.";
  return null;
}

/** Sugestões alternativas quando o slug já está em uso. */
export function slugSuggestions(base: string, city?: string | null): string[] {
  const root = slugify(base) || "meu-negocio";
  const out = new Set<string>();
  const add = (s: string) => {
    const v = slugify(s);
    if (!validateSlug(v) && v !== root) out.add(v);
  };
  if (city) add(`${root}-${city}`);
  add(`${root}-oficial`);
  add(`${root}-agenda`);
  for (let i = 2; out.size < 4 && i < 10; i++) add(`${root}-${i}`);
  return [...out].slice(0, 4);
}
