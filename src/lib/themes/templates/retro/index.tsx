/**
 * Retrô (CAL-146): anos 70 — listras em arco-íris de tons quentes, títulos gordos, selos
 * redondos e textura de pontinhos. Para barbearia clássica, tattoo e lava-jato.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, IconStar, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { RETRO_META } from "../../template-meta";

const DOTS = {
  backgroundImage: "radial-gradient(var(--c-border) 1.2px, transparent 1.2px)",
  backgroundSize: "14px 14px",
};

/** Listras dos anos 70 com tons da cor principal. */
function Stripes({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-1 ${className}`}>
      {[1, 0.75, 0.5, 0.3].map((o) => (
        <span
          key={o}
          className="h-2.5 rounded-full"
          style={{ background: "var(--c-primary)", opacity: o }}
        />
      ))}
    </div>
  );
}

function Title({ title }: { title: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="font-t-display text-4xl leading-none md:text-6xl">{title}</h2>
      <Stripes className="mx-auto mt-4 w-24" />
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-4xl px-5 py-[calc(3.5rem*var(--density,1))] md:py-[calc(5rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="relative overflow-hidden bg-t-bg" style={DOTS}>
    <div
      aria-hidden="true"
      className="absolute -right-24 -bottom-24 hidden size-72 rounded-full md:block md:size-[30rem]"
      style={{
        background:
          "radial-gradient(circle, transparent 38%, var(--c-primary) 38% 46%, transparent 46% 52%, var(--c-primary-soft) 52% 60%, transparent 60%)",
        opacity: 0.9,
      }}
    />
    <div className="relative mx-auto max-w-4xl px-5 pt-10 pb-16 text-center md:pt-16 md:pb-24">
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
      <p
        className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
        style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
      >
        <IconStar className="size-4" /> {data.name} <IconStar className="size-4" />
      </p>
      <p className="mt-2 text-sm font-semibold tracking-widest text-t-sub uppercase">
        {data.segmentLabel}
      </p>
      <h1 className="mx-auto mt-8 max-w-3xl font-t-display text-[2.8rem] leading-[0.95] md:text-7xl">
        {data.headline || defaultHeadline(data.name)}
      </h1>
      <Stripes className="mx-auto mt-6 w-40" />
      <p className="mx-auto mt-6 max-w-lg text-lg text-t-sub">
        {data.subheadline || DEFAULT_SUBHEADLINE}
      </p>
      <CtaLink className="mt-8 w-full text-lg sm:w-auto" />
    </div>
  </section>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos" alt>
    <Title title="Serviços" />
    <ul className="space-y-4">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed p-5 hover:opacity-90"
            style={{ borderColor: "var(--c-border)" }}
          >
            <span
              className="hidden size-14 shrink-0 items-center justify-center rounded-full font-t-display text-xl sm:inline-flex"
              style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
              aria-hidden="true"
            >
              <IconStar />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-t-display text-2xl leading-tight">
                {s.name}
                {s.is_featured ? (
                  <span
                    className="ml-2 align-middle font-t-body text-xs font-bold uppercase"
                    style={{ color: "var(--c-link)" }}
                  >
                    ★ o mais pedido
                  </span>
                ) : null}
              </p>
              {s.description ? <p className="text-sm text-t-sub">{s.description}</p> : null}
              <p className="text-sm text-t-sub">{formatDuration(s.duration_min)}</p>
            </div>
            <p className="font-t-display text-2xl">{formatPrice(s.price_cents)}</p>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe">
    <Title title={data.staff.length === 1 ? "O mestre" : "A turma"} />
    <ul className="flex flex-wrap justify-center gap-8">
      {data.staff.map((p) => (
        <li key={p.id} className="w-36 text-center">
          <span
            className="inline-block rounded-full p-1.5"
            style={{ background: "var(--c-primary)" }}
          >
            <span className="block rounded-full p-1" style={{ background: "var(--c-bg)" }}>
              <ThemedAvatar name={p.name} url={p.photo_url} size={110} />
            </span>
          </span>
          <p className="mt-3 font-t-display text-xl">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos" alt>
    <Title title="Fala, freguesia" />
    <div className="text-center">
      <RatingLine data={data} />
    </div>
    <ul className="grid gap-5 md:grid-cols-2">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="h-full rounded-[var(--radius-card)] bg-t-bg p-6" style={DOTS}>
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote className="mt-1 font-t-display text-xl leading-snug">“{t.text}”</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-t-sub">— {t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="px-5 py-20 text-center" style={DOTS}>
    <Stripes className="mx-auto w-32" />
    <h2 className="mt-6 font-t-display text-5xl leading-none md:text-6xl">Tá esperando o quê?</h2>
    <CtaLink className="mt-8 w-full text-lg sm:w-auto" />
  </section>
);

export const retro: TemplateDefinition = {
  meta: RETRO_META,
  sections: { hero, services, team, testimonials, final },
};
