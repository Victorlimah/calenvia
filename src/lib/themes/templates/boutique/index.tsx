/**
 * Boutique (CAL-146): luxo discreto — serifada fina, letras espaçadas, muito espaço em branco
 * e uma cor só. Para estética, salão, sobrancelha e clínicas de alto padrão.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { BOUTIQUE_META } from "../../template-meta";

const SPACED = "text-xs font-semibold tracking-[0.35em] uppercase";

function Title({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-14 text-center">
      <p className={`${SPACED} text-t-sub`}>{kicker}</p>
      <h2 className="mt-4 font-t-display text-4xl leading-tight font-normal md:text-5xl">
        {title}
      </h2>
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-3xl px-6 py-[calc(5rem*var(--density,1))] md:py-[calc(8rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="bg-t-bg">
    <div className="mx-auto max-w-4xl px-6 pt-12 pb-16 text-center md:pt-20 md:pb-24">
      {data.logo.placements.includes("hero") ? (
        <div className="flex justify-center">
          <BusinessMark
            name={data.name}
            logoUrl={data.logo.url}
            shape={theme.logo.shape}
            size="lg"
          />
        </div>
      ) : null}
      <p className={`mt-6 ${SPACED}`}>{data.name}</p>
      <p className="mt-1 text-sm text-t-sub">{data.segmentLabel}</p>
      <h1 className="mx-auto mt-12 max-w-3xl font-t-display text-[2.4rem] leading-[1.12] font-normal md:text-6xl">
        {data.headline || defaultHeadline(data.name)}
      </h1>
      <p className="mx-auto mt-6 max-w-md text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
      <CtaLink className={`mt-10 w-full sm:w-auto sm:px-12 ${SPACED} text-[13px]!`} />
    </div>
    {data.coverUrl ? (
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <div className="p-2" style={{ border: "1px solid var(--c-border)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.coverUrl}
            alt={`Ambiente da ${data.name}`}
            className="aspect-[21/9] w-full object-cover"
            fetchPriority="high"
          />
        </div>
      </div>
    ) : (
      <div aria-hidden="true" className="mx-auto flex max-w-xs items-center gap-4 px-6 pb-16">
        <span className="h-px flex-1" style={{ background: "var(--c-border)" }} />
        <span className="size-2 rotate-45" style={{ background: "var(--c-primary)" }} />
        <span className="h-px flex-1" style={{ background: "var(--c-border)" }} />
      </div>
    )}
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona" alt>
    <Title kicker="Como funciona" title="Reserve com calma" />
    <ol className="space-y-8 text-center">
      {[
        "Escolha o tratamento",
        "Escolha o dia e o horário",
        data.automaticMessages ? "Receba a confirmação no WhatsApp" : "Seu horário fica reservado",
      ].map((t, i) => (
        <li key={t}>
          <p className={`${SPACED}`} style={{ color: "var(--c-link)" }}>
            {["I", "II", "III"][i]}
          </p>
          <p className="mt-2 font-t-display text-2xl">{t}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title kicker="Tratamentos" title="Nossa carta" />
    <ul className="space-y-10">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link href={`/agendar?servico=${s.id}`} className="block text-center hover:opacity-80">
            <p className={SPACED}>
              {s.name}
              {s.is_featured ? <span style={{ color: "var(--c-link)" }}> · favorito</span> : null}
            </p>
            {s.description ? (
              <p className="mx-auto mt-2 max-w-md text-t-sub">{s.description}</p>
            ) : null}
            <p className="mt-2 font-t-display text-xl">
              {formatPrice(s.price_cents)}{" "}
              <span className="text-base text-t-sub">· {formatDuration(s.duration_min)}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe" alt>
    <Title kicker="Equipe" title="Quem recebe você" />
    <ul className="flex flex-wrap justify-center gap-12">
      {data.staff.map((p) => (
        <li key={p.id} className="w-40 text-center">
          <ThemedAvatar
            name={p.name}
            url={p.photo_url}
            size={140}
            className="mx-auto rounded-none"
          />
          <p className={`mt-4 ${SPACED}`}>{p.name}</p>
          {p.role ? <p className="mt-1 text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos">
    <Title kicker="Depoimentos" title="Experiências" />
    <div className="text-center">
      <RatingLine data={data} />
    </div>
    <ul className="space-y-14">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="text-center">
            <blockquote className="font-t-display text-2xl leading-relaxed italic">
              “{t.text}”
            </blockquote>
            <figcaption className={`mt-4 ${SPACED} text-t-sub`}>{t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section
    className="px-6 py-20 text-center md:py-28"
    style={{ borderTop: "1px solid var(--c-border)" }}
  >
    <p className={`${SPACED} text-t-sub`}>Reservas</p>
    <h2 className="mt-4 font-t-display text-4xl font-normal md:text-5xl">
      Será um prazer receber você
    </h2>
    <CtaLink className={`mt-10 w-full sm:w-auto sm:px-12 ${SPACED} text-[13px]!`} />
  </section>
);

export const boutique: TemplateDefinition = {
  meta: BOUTIQUE_META,
  sections: { hero, how, services, team, testimonials, final },
};
