import { requireBusinessHost } from "@/lib/host-guard";
import { readableTextOn } from "@/lib/color";
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
  const accent = business?.accent_color ?? "#4B3FD9";
  return (
    <div
      className="min-h-dvh bg-night text-night-fg"
      style={{ ["--accent" as string]: accent, ["--accent-fg" as string]: readableTextOn(accent) }}
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
