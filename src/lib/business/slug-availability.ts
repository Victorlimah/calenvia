import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugSuggestions, validateSlug } from "@/lib/slug";

export type SlugCheck =
  | { available: true; slug: string }
  | { available: false; slug: string; reason: string; suggestions: string[] };

/**
 * Verifica se o slug pode ser usado. Usa a service role porque o RLS esconde
 * negócios de outros donos; só devolve sim/não, nunca dados do outro negócio.
 */
export async function checkSlugAvailability(
  slug: string,
  options: { ignoreBusinessId?: string; city?: string | null } = {},
): Promise<SlugCheck> {
  const error = validateSlug(slug);
  if (error) {
    return { available: false, slug, reason: error, suggestions: [] };
  }
  const admin = createSupabaseAdminClient();
  const candidates = [slug, ...slugSuggestions(slug, options.city)];
  const { data } = await admin.from("businesses").select("id, slug").in("slug", candidates);
  const taken = new Set(
    (data ?? []).filter((b) => b.id !== options.ignoreBusinessId).map((b) => b.slug),
  );
  if (!taken.has(slug)) return { available: true, slug };
  return {
    available: false,
    slug,
    reason: "Esse endereço já está em uso.",
    suggestions: candidates.slice(1).filter((s) => !taken.has(s)),
  };
}
