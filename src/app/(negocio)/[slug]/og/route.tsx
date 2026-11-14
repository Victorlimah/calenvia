import { ImageResponse } from "next/og";
import { readableTextOn } from "@/lib/color";
import { businessDisplayHost } from "@/lib/hosts";
import { getPublicBusiness } from "@/lib/public/business";

export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };

/** Prévia do link do negócio (WhatsApp, Instagram, Facebook): nome, logo e cor de destaque. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  const name = b?.name ?? "Calenvia";
  const accent = b?.accent_color ?? "#4B3FD9";
  const fg = readableTextOn(accent);
  const headline = b?.headline ?? "Agende seu horário online, sem criar conta.";
  // Satori desenha PNG/JPEG; a logo (WebP) entra como fundo só se o navegador do Satori aceitar.
  const logo = b?.logo_url ?? null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#111216",
        color: "#F5F2EA",
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={120} height={120} style={{ borderRadius: 28 }} alt="" />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 28,
              background: accent,
              color: fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 800,
            }}
          >
            {name.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
          {name}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 44, lineHeight: 1.2, color: "#D9D4C8" }}>
        {headline.slice(0, 110)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            background: accent,
            color: fg,
            borderRadius: 18,
            padding: "18px 34px",
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          Agendar meu horário
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#A9A499" }}>
          {b ? businessDisplayHost(b.slug) : "calenvia.com.br"}
        </div>
      </div>
    </div>,
    SIZE,
  );
}
