import { ImageResponse } from "next/og";
import { initials, pickLogo } from "@/lib/themes/logo";
import { parseTheme, resolveTheme } from "@/lib/themes/resolve";
import { businessDisplayHost } from "@/lib/hosts";
import { getPublicBusiness } from "@/lib/public/business";

export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };

/** Prévia do link do negócio (WhatsApp, Instagram, Facebook): nome, logo e cor de destaque. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  const name = b?.name ?? "Calenvia";
  // Cores e logo do tema (CAL-143); sem negócio, o padrão.
  const resolved = resolveTheme(b?.theme ?? null, b?.accent_color);
  const theme = parseTheme(b?.theme ?? null, b?.accent_color);
  const c = resolved.colors;
  const accent = c.primary;
  const fg = c.primaryFg;
  const headline = b?.headline ?? "Agende seu horário online, sem criar conta.";
  // Satori desenha PNG/JPEG: logos novos já são PNG (CAL-143); WebP antigo vira monograma.
  const picked = b
    ? pickLogo({
        name,
        logoUrl: b.logo_url,
        logoAltUrl: b.logo_alt_url,
        mode: theme.palette.mode,
        show: theme.logo.show,
      }).url
    : null;
  const logo = picked && !/\.webp(\?|$)/i.test(picked) ? picked : null;
  const round = theme.logo.shape === "round" ? 60 : 28;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: c.bg,
        color: c.text,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            width={120}
            height={120}
            style={{ borderRadius: round, objectFit: "contain" }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: round,
              background: accent,
              color: fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 800,
            }}
          >
            {initials(name)}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>
          {name}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 44, lineHeight: 1.2, color: c.sub }}>
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
        <div style={{ display: "flex", fontSize: 30, color: c.sub }}>
          {b ? businessDisplayHost(b.slug) : "calenvia.com.br"}
        </div>
      </div>
    </div>,
    SIZE,
  );
}
