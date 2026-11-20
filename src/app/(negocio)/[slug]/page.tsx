import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isBookingOpen } from "@/lib/plans";
import { getPublicBusiness, getPublicCatalog, getPublicPageContent } from "@/lib/public/business";
import { businessUrl } from "@/lib/hosts";
import { jsonLdString, localBusinessJsonLd } from "@/lib/seo/local-business";
import { Unavailable } from "./unavailable";
import { PublicPage } from "@/components/negocio/public-page";
import { buildPageData } from "@/lib/public/page-data";
import { parseTheme } from "@/lib/themes/resolve";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  if (!b) return { title: "Página não encontrada" };
  const title = `${b.name} — Agende seu horário`;
  const description =
    b.subheadline ??
    `Agende online na ${b.name}${b.address ? `, ${b.address.split("—").pop()?.trim()}` : ""}. Rápido, sem criar conta.`;
  const url = businessUrl(b.slug, "/");
  const image = { url: businessUrl(b.slug, "/og"), width: 1200, height: 630, alt: b.name };
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isBookingOpen(b) ? undefined : { index: false },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url,
      siteName: b.name,
      title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function NegocioPage({ params }: Props) {
  const { slug } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  if (!isBookingOpen(business)) return <Unavailable name={business.name} />;

  const [{ services, staff }, content] = await Promise.all([
    getPublicCatalog(business.id),
    getPublicPageContent(business.id),
  ]);
  const theme = parseTheme(business.theme, business.accent_color);
  const data = buildPageData(business, theme, services, staff, content);

  const jsonLd = localBusinessJsonLd({
    name: business.name,
    url: businessUrl(business.slug, "/"),
    image: business.cover_url ?? business.logo_url,
    address: business.address,
    whatsapp: business.whatsapp,
    description: business.subheadline,
    hours: content.hours,
    services,
    rating: content.rating,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      {/* CAL-144: seções do template, na ordem e com a visibilidade escolhidas pelo dono. */}
      <PublicPage data={data} theme={theme} />
    </>
  );
}
