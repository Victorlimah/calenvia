/**
 * Domínio próprio → slug do negócio (CAL-099). Roda no middleware (edge): só fetch,
 * sem bibliotecas do Node. Cache em memória de 60 s (inclusive "não encontrado").
 */
import { hasFeature } from "@/lib/plans";

type Entry = { slug: string | null; until: number };
const cache = new Map<string, Entry>();
const TTL_MS = 60_000;

type Row = {
  verified_at: string | null;
  businesses: { slug: string; plan: string; plan_status: string } | null;
};

export function slugFromRow(row: Row | undefined): string | null {
  if (!row?.verified_at || !row.businesses) return null;
  return hasFeature(row.businesses, "customDomain") ? row.businesses.slug : null;
}

export async function slugForDomain(
  domain: string,
  opts: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<string | null> {
  const now = opts.now ?? Date.now();
  const hit = cache.get(domain);
  if (hit && hit.until > now) return hit.slug;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const res = await (opts.fetchImpl ?? fetch)(
      `${url}/rest/v1/custom_domains?select=verified_at,businesses(slug,plan,plan_status)&domain=eq.${encodeURIComponent(domain)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" },
    );
    if (!res.ok) return null; // erro: não guarda em cache
    const rows = (await res.json()) as Row[];
    const slug = slugFromRow(rows[0]);
    cache.set(domain, { slug, until: now + TTL_MS });
    if (cache.size > 5000) cache.clear();
    return slug;
  } catch {
    return null;
  }
}

/** Só para testes. */
export function clearDomainCache() {
  cache.clear();
}
