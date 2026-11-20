import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveHost } from "@/lib/hosts";
import { getPublicBusiness } from "@/lib/public/business";
import { resolveTheme } from "@/lib/themes/resolve";

/** Manifest do app (CAL-065). No host do painel vira o app "Calenvia" para o dono. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = resolveHost((await headers()).get("host"));
  const painel = host.kind === "app";
  // Página do negócio (CAL-143): nome, cores e logo do próprio negócio.
  if (host.kind === "business") {
    const b = await getPublicBusiness(host.slug);
    if (b) {
      const r = resolveTheme(b.theme, b.accent_color);
      const logo = b.logo_url && /\.png(\?|$)/i.test(b.logo_url) ? b.logo_url : null;
      return {
        name: b.name,
        short_name: b.name.slice(0, 12),
        description: `Agende seu horário na ${b.name}.`,
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: r.colors.bg,
        theme_color: r.colors.primary,
        icons: logo
          ? [{ src: logo, sizes: "512x512", type: "image/png" }]
          : [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      };
    }
  }
  return {
    name: painel ? "Calenvia — sua agenda" : "Calenvia",
    short_name: "Calenvia",
    description: "Agenda, clientes e agendamentos do seu negócio.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBFAF7",
    theme_color: "#4B3FD9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: painel
      ? [
          { name: "Novo agendamento", url: "/novo" },
          { name: "Bloquear horário", url: "/bloquear" },
          { name: "Clientes", url: "/clientes" },
        ]
      : undefined,
  };
}
