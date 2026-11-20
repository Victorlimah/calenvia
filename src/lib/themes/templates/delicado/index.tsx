/**
 * Delicado (CAL-145): fundo claro e quente, serifada elegante, cantos suaves e ornamentos
 * finos. Para salão, manicure, estética e sobrancelha.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { DELICADO_META } from "../../template-meta";

function Ornament({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex w-40 items-center gap-3 ${className}`}>
      <span className="h-px flex-1" style={{ background: "var(--c-border)" }} />
      <span className="text-sm" style={{ color: "var(--c-link)" }}>
        ✦
      </span>
      <span className="h-px flex-1" style={{ background: "var(--c-border)" }} />
    </div>
  );
}

function Title({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p
        className="text-xs font-bold tracking-[0.3em] uppercase"
        style={{ color: "var(--c-link)" }}
      >
        {kicker}
      </p>
      <h2 className="mt-3 font-t-display text-4xl leading-tight font-semibold md:text-5xl">
        {title}
      </h2>
      <Ornament className="mx-auto mt-5" />
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-3xl px-5 py-[calc(4rem*var(--density,1))] md:py-[calc(6rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

/** Arco com a foto de capa ou, sem foto, um desenho de arcos finos na cor do tema. */
function Arch({ url, name }: { url: string | null; name: string }) {
  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-[999px] rounded-b-[var(--radius-card)]"
      style={{ background: "var(--c-primary-soft)", border: "1px solid var(--c-border)" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Ambiente da ${name}`}
          className="absolute inset-0 size-full object-cover"
          fetchPriority="high"
        />
      ) : (
        <svg viewBox="0 0 200 250" aria-hidden="true" className="absolute inset-0 size-full">
          {[40, 70, 100, 130].map((r) => (
            <circle
              key={r}
              cx="100"
              cy="250"
              r={r * 1.4}
              fill="none"
              stroke="var(--c-primary)"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          ))}
          <circle cx="150" cy="70" r="18" fill="var(--c-primary)" fillOpacity="0.18" />
          <circle cx="58" cy="110" r="8" fill="var(--c-primary)" fillOpacity="0.25" />
        </svg>
      )}
    </div>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="relative overflow-hidden bg-t-bg">
    <div className="mx-auto max-w-5xl px-5 pt-10 pb-16 md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:gap-14 md:pt-20 md:pb-24">
      <div className="text-center md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark name={data.name} logoUrl={data.logo.url} shape={theme.logo.shape} />
          ) : null}
          <div>
            <p className="font-t-display text-xl font-semibold">{data.name}</p>
            <p className="text-xs font-semibold tracking-[0.25em] text-t-sub uppercase">
              {data.segmentLabel}
            </p>
          </div>
        </div>
        <Ornament className="mx-auto mt-8 md:mx-0" />
        <h1 className="mt-6 font-t-display text-[2.5rem] leading-[1.08] font-semibold md:text-6xl">
          {data.headline || defaultHeadline(data.name)}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-lg text-t-sub md:mx-0">
          {data.subheadline || DEFAULT_SUBHEADLINE}
        </p>
        <CtaLink className="mt-9 w-full sm:w-auto" />
      </div>
      <div className="mt-12 md:mt-0">
        <Arch url={data.coverUrl} name={data.name} />
      </div>
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona">
    <Title kicker="Como funciona" title="Simples e sem pressa" />
    <ol className="grid gap-8 text-center md:grid-cols-3">
      {[
        ["Escolha o cuidado", "Veja a duração e o valor antes."],
        ["Escolha dia e hora", "Só aparecem horários livres."],
        [
          "Pronto",
          data.automaticMessages
            ? "A confirmação chega no seu WhatsApp."
            : "Seu horário fica reservado.",
        ],
      ].map(([t, d], i) => (
        <li key={t}>
          <p className="font-t-display text-5xl font-semibold" style={{ color: "var(--c-link)" }}>
            {String(i + 1).padStart(2, "0")}
          </p>
          <p className="mt-2 font-t-display text-xl font-semibold">{t}</p>
          <p className="mt-1 text-t-sub">{d}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos" alt>
    <Title kicker="Serviços" title="Nossos cuidados" />
    <ul className="border-y border-t-border">
      {data.services.map((s) => (
        <li key={s.id} className="border-b border-t-border last:border-b-0">
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex items-start gap-4 py-5 transition-opacity hover:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <p className="font-t-display text-xl font-semibold">
                {s.name}
                {s.is_featured ? (
                  <span
                    className="ml-2 inline-block rounded-full border px-2.5 py-0.5 align-middle font-t-body text-xs font-bold"
                    style={{ borderColor: "var(--c-link)", color: "var(--c-link)" }}
                  >
                    Mais pedido
                  </span>
                ) : null}
              </p>
              {s.description ? <p className="mt-1 text-sm text-t-sub">{s.description}</p> : null}
              <p className="mt-1 text-sm text-t-sub">{formatDuration(s.duration_min)}</p>
            </div>
            <div className="text-right">
              <p className="font-t-display text-xl font-semibold">{formatPrice(s.price_cents)}</p>
              <p className="text-sm font-semibold" style={{ color: "var(--c-link)" }}>
                Agendar
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe">
    <Title
      kicker="Equipe"
      title={data.staff.length === 1 ? "Quem cuida de você" : "Quem cuida de você"}
    />
    <ul className="flex flex-wrap justify-center gap-x-10 gap-y-8">
      {data.staff.map((p) => (
        <li key={p.id} className="flex w-36 flex-col items-center text-center">
          <span className="rounded-full p-1.5" style={{ boxShadow: "0 0 0 1px var(--c-border)" }}>
            <ThemedAvatar name={p.name} url={p.photo_url} size={112} />
          </span>
          <p className="mt-4 font-t-display text-lg font-semibold">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos" alt>
    <Title kicker="Depoimentos" title="Palavras de quem veio" />
    <div className="text-center">
      <RatingLine data={data} />
    </div>
    <ul className="space-y-10">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="mx-auto max-w-xl text-center">
            {t.rating ? <Stars rating={t.rating} className="text-lg" /> : null}
            <blockquote className="mt-2 font-t-display text-2xl leading-snug italic">
              “{t.text}”
            </blockquote>
            <figcaption className="mt-3 text-sm font-semibold tracking-wider text-t-sub uppercase">
              {t.author_name}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="px-5 py-16">
    <div
      className="mx-auto max-w-3xl rounded-[var(--radius-card)] px-6 py-14 text-center"
      style={{ background: "var(--c-primary-soft)" }}
    >
      <Ornament className="mx-auto" />
      <h2 className="mt-5 font-t-display text-4xl leading-tight font-semibold">
        Reserve um momento para você
      </h2>
      <p className="mt-3 text-t-sub">Escolha o melhor dia e hora. Leva menos de um minuto.</p>
      <CtaLink className="mt-8 w-full sm:w-auto" />
    </div>
  </section>
);

export const delicado: TemplateDefinition = {
  meta: DELICADO_META,
  sections: { hero, how, services, team, testimonials, final },
};
