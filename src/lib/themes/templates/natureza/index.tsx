/**
 * Natureza (CAL-145): tons terrosos e verdes, formas orgânicas, ondas entre as seções e
 * tipografia calma. Para spa, massagem, yoga, pilates e nutrição.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, IconLeaf, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { NATUREZA_META } from "../../template-meta";

const BLOB = "rounded-[58%_42%_48%_52%/52%_46%_54%_48%]";

/** Onda que liga uma seção à outra (cor da seção de baixo). */
function Wave({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="block h-10 w-full md:h-16"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <path d="M0 40c240 40 480 40 720 10S1200-10 1440 30v50H0z" fill={color} />
    </svg>
  );
}

function Title({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p
        className="flex items-center justify-center gap-2 text-sm font-semibold"
        style={{ color: "var(--c-link)" }}
      >
        <IconLeaf className="size-4" />
        {kicker}
      </p>
      <h2 className="mt-2 font-t-display text-3xl leading-tight md:text-4xl">{title}</h2>
    </div>
  );
}

/** Seção com fundo alternado e ondas nas bordas. */
function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id}>
      {alt ? <Wave color="var(--c-surface)" /> : null}
      <div className={alt ? "bg-t-surface" : ""}>
        <div className="mx-auto max-w-4xl px-5 py-[calc(3.5rem*var(--density,1))] md:py-[calc(5rem*var(--density,1))]">
          {children}
        </div>
      </div>
      {alt ? <Wave color="var(--c-surface)" flip /> : null}
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="relative overflow-hidden bg-t-bg">
    <div
      aria-hidden="true"
      className={`absolute -top-24 -right-24 size-72 opacity-60 md:size-[28rem] ${BLOB}`}
      style={{ background: "var(--c-primary-soft)" }}
    />
    <div className="relative mx-auto max-w-5xl px-5 pt-10 pb-16 md:grid md:grid-cols-2 md:items-center md:gap-12 md:pt-20 md:pb-24">
      <div>
        <div className="flex items-center gap-3">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark name={data.name} logoUrl={data.logo.url} shape={theme.logo.shape} />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-t-display text-lg">{data.name}</p>
            <p className="text-sm text-t-sub">{data.segmentLabel}</p>
          </div>
        </div>
        <h1 className="mt-8 font-t-display text-[2.2rem] leading-[1.15] md:text-5xl">
          {data.headline || defaultHeadline(data.name)}
        </h1>
        <p className="mt-4 text-lg text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
        <CtaLink className="mt-8 w-full sm:w-auto" />
      </div>
      <div className="relative mx-auto mt-12 aspect-square w-full max-w-sm md:mt-0">
        <div
          className={`absolute inset-0 overflow-hidden ${BLOB}`}
          style={{ background: "var(--c-primary-soft)" }}
        >
          {data.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverUrl}
              alt={`Ambiente da ${data.name}`}
              className="size-full object-cover"
              fetchPriority="high"
            />
          ) : (
            <svg viewBox="0 0 200 200" aria-hidden="true" className="size-full">
              <path
                d="M100 170c-30-35-35-80 0-130 35 50 30 95 0 130z"
                fill="var(--c-primary)"
                fillOpacity="0.55"
              />
              <path d="M100 170V60" stroke="var(--c-bg)" strokeWidth="3" strokeLinecap="round" />
              <path
                d="M58 150c-10-28 0-55 30-70 4 32-8 55-30 70zM142 150c10-28 0-55-30-70-4 32 8 55 30 70z"
                fill="var(--c-primary)"
                fillOpacity="0.3"
              />
            </svg>
          )}
        </div>
        <div
          aria-hidden="true"
          className={`absolute -bottom-4 -left-4 size-20 ${BLOB}`}
          style={{ background: "var(--c-primary)", opacity: 0.25 }}
        />
      </div>
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona">
    <Title kicker="Como funciona" title="Três passos, sem pressa" />
    <ol className="grid gap-6 md:grid-cols-3">
      {[
        ["Escolha o cuidado", "Com duração e valor à vista."],
        ["Escolha o momento", "Só horários realmente livres."],
        [
          "Respire",
          data.automaticMessages
            ? "A confirmação chega no WhatsApp."
            : "Seu horário fica guardado.",
        ],
      ].map(([t, d], i) => (
        <li key={t} className="text-center">
          <span
            className={`mx-auto inline-flex size-16 items-center justify-center font-t-display text-2xl ${BLOB}`}
            style={{ background: "var(--c-primary-soft)", color: "var(--c-link)" }}
          >
            {i + 1}
          </span>
          <p className="mt-4 font-t-display text-xl">{t}</p>
          <p className="mt-1 text-t-sub">{d}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos" alt>
    <Title kicker="Cuidados" title="Escolha o seu momento" />
    <ul className="grid gap-4 md:grid-cols-2">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex h-full gap-4 rounded-[var(--radius-card)] bg-t-bg p-5 transition-transform hover:-translate-y-0.5"
          >
            <span
              className={`inline-flex size-12 shrink-0 items-center justify-center ${BLOB}`}
              style={{ background: "var(--c-primary-soft)", color: "var(--c-link)" }}
            >
              <IconLeaf />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-t-display text-lg">
                {s.name}
                {s.is_featured ? (
                  <span
                    className="ml-2 inline-block rounded-full px-2.5 py-0.5 align-middle font-t-body text-xs font-bold"
                    style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
                  >
                    Mais pedido
                  </span>
                ) : null}
              </p>
              {s.description ? <p className="mt-1 text-sm text-t-sub">{s.description}</p> : null}
              <p className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-t-sub">{formatDuration(s.duration_min)}</span>
                <span className="font-bold">{formatPrice(s.price_cents)}</span>
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
    <ul className="flex flex-wrap justify-center gap-8">
      {data.staff.map((p) => (
        <li key={p.id} className="w-36 text-center">
          <ThemedAvatar name={p.name} url={p.photo_url} size={120} className={BLOB} />
          <p className="mt-3 font-t-display text-lg">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos" alt>
    <Title kicker="Depoimentos" title="Quem veio, voltou" />
    <div className="text-center">
      <RatingLine data={data} />
    </div>
    <ul className="grid gap-4 md:grid-cols-2">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="h-full rounded-[var(--radius-card)] bg-t-bg p-6">
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote className="mt-2 font-t-display text-lg leading-relaxed">
              “{t.text}”
            </blockquote>
            <figcaption className="mt-3 text-sm font-semibold text-t-sub">
              {t.author_name}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="relative overflow-hidden px-5 py-20 text-center">
    <div
      aria-hidden="true"
      className={`absolute -bottom-20 left-1/2 size-80 -translate-x-1/2 ${BLOB}`}
      style={{ background: "var(--c-primary-soft)" }}
    />
    <div className="relative mx-auto max-w-2xl">
      <h2 className="font-t-display text-4xl leading-tight">Reserve um tempo para você</h2>
      <p className="mt-3 text-t-sub">Escolha o melhor dia e hora.</p>
      <CtaLink className="mt-8 w-full sm:w-auto" />
    </div>
  </section>
);

export const natureza: TemplateDefinition = {
  meta: NATUREZA_META,
  sections: { hero, how, services, team, testimonials, final },
};
