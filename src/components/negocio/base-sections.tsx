/**
 * Seções-base da página pública (CAL-144) = o visual "Noturno". Cada template pode redesenhar
 * qualquer uma; as que ele não redesenha vêm daqui. Só tokens de tema, nunca cor fixa.
 */
import { Hero } from "./hero";
import {
  CtaButton,
  Faq,
  Gallery,
  HowItWorks,
  Location,
  Section,
  SectionTitle,
  ServicesList,
  Team,
  Testimonials,
} from "./sections";
import type { SectionComponent } from "./template-types";
import type { PageData } from "./page-data";
import type { SectionId } from "@/lib/themes/schema";

/** A seção tem conteúdo para mostrar? (sem serviços, fotos, equipe ou depoimentos: some) */
export function sectionHasContent(id: SectionId, data: PageData): boolean {
  switch (id) {
    case "services":
      return data.services.length > 0;
    case "gallery":
      return data.photos.length > 0;
    case "team":
      return data.staff.length > 0;
    case "testimonials":
      return data.testimonials.length > 0;
    default:
      return true;
  }
}

export function RatingLine({ data }: { data: PageData }) {
  if (!(data.rating.count >= 3 && data.rating.average)) return null;
  return (
    <p className="-mt-4 mb-6 text-lg font-semibold">
      <span aria-hidden="true" style={{ color: "var(--c-link)" }}>
        ★
      </span>{" "}
      {data.rating.average.toFixed(1).replace(".", ",")} de 5 · {data.rating.count} avaliações
    </p>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <Hero
    name={data.name}
    segmentLabel={data.segmentLabel}
    headline={data.headline}
    subheadline={data.subheadline}
    logoUrl={data.logo.url}
    logoShape={theme.logo.shape}
    showLogo={data.logo.placements.includes("hero")}
    coverUrl={data.coverUrl}
  />
);

const how: SectionComponent = ({ data }) => (
  <Section id="como-funciona">
    <SectionTitle kicker="Como funciona" title="Agende em menos de 1 minuto" />
    <HowItWorks automatic={data.automaticMessages} />
  </Section>
);

const services: SectionComponent = ({ data }) => (
  <Section id="servicos" alt>
    <SectionTitle kicker="Serviços" title="Escolha o seu" />
    <ServicesList services={data.services} />
  </Section>
);

const gallery: SectionComponent = ({ data, next }) => (
  <Section id="trabalho" tightBottom={next === "team"}>
    <SectionTitle kicker="Nosso trabalho" title="Veja de perto" />
    <Gallery photos={data.photos} name={data.name} />
  </Section>
);

const team: SectionComponent = ({ data, prev }) => (
  <Section id="equipe" flushTop={prev === "gallery"}>
    <SectionTitle
      kicker="Equipe"
      title={data.staff.length === 1 ? "Quem atende você" : "Quem atende"}
    />
    <Team staff={data.staff} />
  </Section>
);

const testimonials: SectionComponent = ({ data }) => (
  <Section id="depoimentos" alt>
    <SectionTitle kicker="Depoimentos" title="Quem já veio, recomenda" />
    <RatingLine data={data} />
    <Testimonials items={data.testimonials} />
  </Section>
);

const location: SectionComponent = ({ data }) => (
  <Section id="onde-fica">
    <SectionTitle kicker="Onde fica" title="Endereço e horários" />
    <Location
      address={data.address}
      reference={data.addressReference}
      hours={data.hours}
      breaks={data.breaks}
      todayWeekday={data.todayWeekday}
    />
  </Section>
);

const faq: SectionComponent = ({ data }) => (
  <Section id="duvidas" alt>
    <SectionTitle kicker="Dúvidas" title="Perguntas frequentes" />
    <Faq items={data.faq} />
  </Section>
);

const final: SectionComponent = ({ data }) => (
  <section className="relative overflow-hidden">
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-30"
      style={{
        background: "radial-gradient(80% 100% at 50% 100%, var(--c-primary) 0%, transparent 70%)",
      }}
    />
    <div className="relative mx-auto max-w-2xl px-5 py-20 text-center">
      <h2 className="font-t-display text-4xl leading-tight font-extrabold">
        Seu horário está esperando
      </h2>
      <p className="mt-3 text-t-sub">Escolha o melhor dia e hora para você.</p>
      <CtaButton className="mt-8 w-full sm:w-auto" />
    </div>
  </section>
);

export const BASE_SECTIONS: Record<SectionId, SectionComponent> = {
  hero,
  how,
  services,
  gallery,
  team,
  testimonials,
  location,
  faq,
  final,
};
