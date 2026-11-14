import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { businessUrl, resolveHost, siteUrl } from "@/lib/hosts";

/** robots.txt por host: o painel nunca é indexado; site e páginas de negócio, sim. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = resolveHost((await headers()).get("host"));
  if (host.kind === "app" || host.kind === "unknown") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = host.kind === "business" ? businessUrl(host.slug, "/") : siteUrl("/");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/confirmado/", "/gerenciar/", "/api/"],
    },
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
  };
}
