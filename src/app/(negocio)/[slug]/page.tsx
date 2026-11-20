import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/negocio/hero";
import {
  CtaButton,
  Faq,
  Gallery,
  HowItWorks,
  Location,
  Section,
  SectionTitle,
  ServicesList,
  StickyCta,
  Team,
  Testimonials,
} from "@/components/negocio/sections";
import { segmentLabel } from "@/lib/business/segments";
import { todayIn, weekdayOf } from "@/lib/dates";
import { canSendAutomaticMessages, isBookingOpen } from "@/lib/plans";
import { getPublicBusiness, getPublicCatalog, getPublicPageContent } from "@/lib/public/business";
import { buildFaq } from "@/lib/public/faq";
import { businessUrl } from "@/lib/hosts";
import { jsonLdString, localBusinessJsonLd } from "@/lib/seo/local-business";
import { Unavailable } from "./unavailable";

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
  const faq = buildFaq(business);

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
      <Hero
        name={business.name}
        segmentLabel={segmentLabel(business.segment)}
        headline={business.headline}
        subheadline={business.subheadline}
        logoUrl={business.logo_url}
        coverUrl={business.cover_url}
      />

      <Section id="como-funciona">
        <SectionTitle kicker="Como funciona" title="Agende em menos de 1 minuto" />
        <HowItWorks automatic={canSendAutomaticMessages(business)} />
      </Section>

      {services.length ? (
        <Section id="servicos" alt>
          <SectionTitle kicker="Serviços" title="Escolha o seu" />
          <ServicesList services={services} />
        </Section>
      ) : null}

      {content.photos.length || staff.length ? (
        <Section id="trabalho">
          {content.photos.length ? (
            <>
              <SectionTitle kicker="Nosso trabalho" title="Veja de perto" />
              <Gallery photos={content.photos} name={business.name} />
            </>
          ) : null}
          {staff.length ? (
            <div className={content.photos.length ? "mt-14" : ""}>
              <SectionTitle
                kicker="Equipe"
                title={staff.length === 1 ? "Quem atende você" : "Quem atende"}
              />
              <Team staff={staff} />
            </div>
          ) : null}
        </Section>
      ) : null}

      {content.testimonials.length ? (
        <Section id="depoimentos" alt>
          <SectionTitle kicker="Depoimentos" title="Quem já veio, recomenda" />
          {content.rating.count >= 3 && content.rating.average ? (
            <p className="-mt-4 mb-6 text-lg font-semibold">
              <span aria-hidden="true" style={{ color: "var(--c-link)" }}>
                ★
              </span>{" "}
              {content.rating.average.toFixed(1).replace(".", ",")} de 5 · {content.rating.count}{" "}
              avaliações
            </p>
          ) : null}
          <Testimonials items={content.testimonials} />
        </Section>
      ) : null}

      <Section id="onde-fica">
        <SectionTitle kicker="Onde fica" title="Endereço e horários" />
        <Location
          address={business.address}
          reference={business.address_reference}
          hours={content.hours}
          breaks={content.breaks}
          todayWeekday={weekdayOf(todayIn(business.timezone))}
        />
      </Section>

      <Section id="duvidas" alt>
        <SectionTitle kicker="Dúvidas" title="Perguntas frequentes" />
        <Faq items={faq} />
      </Section>

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(80% 100% at 50% 100%, var(--c-primary) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl px-5 py-20 text-center">
          <h2 className="font-display text-4xl leading-tight font-extrabold">
            Seu horário está esperando
          </h2>
          <p className="mt-3 text-t-sub">Escolha o melhor dia e hora para você.</p>
          <CtaButton className="mt-8 w-full sm:w-auto" />
        </div>
      </section>

      <footer className="px-5 pt-6 pb-32 text-center text-xs text-t-sub">
        Agendamento online por{" "}
        <a href="https://calenvia.com.br" className="underline underline-offset-2">
          Calenvia
        </a>
      </footer>

      <StickyCta name={business.name} />
    </>
  );
}
