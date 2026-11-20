import { requireBusinessHost } from "@/lib/host-guard";
import { resolveTheme, themeCssVars } from "@/lib/themes/resolve";
import { fontPairClassName } from "@/lib/themes/fonts";
import { getPublicBusiness } from "@/lib/public/business";
import { isDemoSlug } from "@/lib/demo";
import { siteUrl } from "@/lib/hosts";

export default async function NegocioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireBusinessHost(slug);
  const business = await getPublicBusiness(slug);
  // CAL-140: tokens do tema na raiz; sem tema, o padrão "Noturno" com a cor do negócio.
  const resolved = resolveTheme(business?.theme ?? null, business?.accent_color);
  const vars = themeCssVars(resolved);
  return (
    <div
      data-theme-root=""
      className={`min-h-dvh bg-t-bg text-t-text ${fontPairClassName(resolved.theme.fontPairId)}`}
      style={vars as React.CSSProperties}
    >
      {isDemoSlug(slug) ? (
        <p
          role="note"
          className="sticky top-0 z-40 bg-white px-4 py-2 text-center text-sm font-semibold text-ink"
        >
          Demonstração da Calenvia: negócio fictício, nenhuma mensagem é enviada.{" "}
          <a href={siteUrl("/#planos")} className="text-brand underline">
            Criar a minha página
          </a>
        </p>
      ) : null}
      {children}
    </div>
  );
}
