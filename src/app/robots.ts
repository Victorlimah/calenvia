import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { slugForDomain } from "@/lib/domains/lookup";
import { businessUrl, resolveHost, siteUrl } from "@/lib/hosts";

/** robots.txt por host: o painel nunca é indexado; site e páginas de negócio, sim. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = resolveHost((await headers()).get("host"));
  let customBase: string | null = null;
  if (host.kind === "custom") {
    const slug = await slugForDomain(host.domain);
    if (slug) {
      customBase = `https://${host.domain}/`;
      host = { kind: "business", slug };
    }
  }
  if (host.kind === "app" || host.kind === "unknown" || host.kind === "custom") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base =
    customBase ?? (host.kind === "business" ? businessUrl(host.slug, "/") : siteUrl("/"));
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/confirmado/", "/gerenciar/", "/api/"],
    },
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
