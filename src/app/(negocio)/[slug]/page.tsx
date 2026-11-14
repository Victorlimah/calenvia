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
import { Unavailable } from "./unavailable";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = await getPublicBusiness(slug);
  if (!b) return { title: "Página não encontrada" };
  return {
    title: `${b.name} — Agende seu horário`,
    description: b.subheadline ?? `Agende online na ${b.name}. Rápido, sem criar conta.`,
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
  const accent = business.accent_color;
  const faq = buildFaq(business);

  return (
    <>
      <Hero
        name={business.name}
        segmentLabel={segmentLabel(business.segment)}
        headline={business.headline}
        subheadline={business.subheadline}
        accent={accent}
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
            background: `radial-gradient(80% 100% at 50% 100%, ${accent} 0%, transparent 70%)`,
          }}
        />
        <div className="relative mx-auto max-w-2xl px-5 py-20 text-center">
          <h2 className="font-display text-4xl leading-tight font-extrabold">
            Seu horário está esperando
          </h2>
          <p className="mt-3 text-night-sub">Escolha o melhor dia e hora para você.</p>
          <CtaButton accent={accent} className="mt-8 w-full sm:w-auto" />
        </div>
      </section>

      <footer className="px-5 pt-6 pb-32 text-center text-xs text-night-sub">
        Agendamento online por{" "}
        <a href="https://calenvia.com.br" className="underline underline-offset-2">
          Calenvia
        </a>
      </footer>

      <StickyCta accent={accent} name={business.name} />
    </>
  );
}
