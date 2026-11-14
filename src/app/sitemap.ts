import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { businessUrl, resolveHost, siteUrl } from "@/lib/hosts";
import { isBookingOpen } from "@/lib/plans";
import { getPublicBusiness } from "@/lib/public/business";

/** sitemap.xml por host (site da Calenvia ou página do negócio). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = resolveHost((await headers()).get("host"));
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
    return [
      { url: businessUrl(b.slug, "/"), changeFrequency: "weekly", priority: 1 },
      { url: businessUrl(b.slug, "/agendar"), changeFrequency: "daily", priority: 0.8 },
    ];
  }
  return [];
}
