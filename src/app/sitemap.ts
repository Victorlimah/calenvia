import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { slugForDomain } from "@/lib/domains/lookup";
import { businessUrl, resolveHost, siteUrl } from "@/lib/hosts";
import { isBookingOpen } from "@/lib/plans";
import { getPublicBusiness } from "@/lib/public/business";

/** sitemap.xml por host (site da Calenvia ou página do negócio). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let host = resolveHost((await headers()).get("host"));
  let customBase: string | null = null;
  if (host.kind === "custom") {
    const slug = await slugForDomain(host.domain);
    if (slug) {
      customBase = `https://${host.domain}/`;
      host = { kind: "business", slug };
    }
  }
  if (host.kind === "site") {
    return ["/", "/termos", "/privacidade"].map((p) => ({
      url: siteUrl(p),
      changeFrequency: "monthly",
      priority: p === "/" ? 1 : 0.3,
    }));
  }
  if (host.kind === "business") {
    const b = await getPublicBusiness(host.slug);
    if (!b || !isBookingOpen(b)) return [];
    const url = (p: string) =>
      customBase ? `${customBase.replace(/\/$/, "")}${p}` : businessUrl(b.slug, p);
    return [
      { url: url("/"), changeFrequency: "weekly", priority: 1 },
      { url: url("/agendar"), changeFrequency: "daily", priority: 0.8 },
    ];
  }
  return [];
}
