/**
 * Pop (CAL-146): colorido e jovem — blocos de cor, formas geométricas e sombras "chapadas".
 * Para personal, pet, nail e estúdios jovens.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { POP_META } from "../../template-meta";

const BLOCK = { boxShadow: "6px 6px 0 var(--c-text)", border: "2px solid var(--c-text)" };

function Title({ title }: { title: string }) {
  return (
    <h2 className="mb-8 font-t-display text-4xl leading-none font-extrabold tracking-tight md:text-5xl">
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="absolute -bottom-1 left-0 h-3 w-full -rotate-1"
          style={{ background: "var(--c-primary-soft)" }}
        />
        <span className="relative">{title}</span>
      </span>
    </h2>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-5xl px-5 py-[calc(3.5rem*var(--density,1))] md:py-[calc(5rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

/** Composição geométrica: círculo, quadrado e triângulo nas cores do tema (ou a capa no círculo). */
function Shapes({ coverUrl, name }: { coverUrl: string | null; name: string }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm">
      <div
        className="absolute top-0 right-0 size-[62%] overflow-hidden rounded-full"
        style={{ ...BLOCK, background: "var(--c-primary)" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={`Foto da ${name}`}
            className="size-full object-cover"
            fetchPriority="high"
          />
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-[6%] left-0 size-[44%] rotate-6 rounded-[var(--radius-card)]"
        style={{ ...BLOCK, background: "var(--c-primary-soft)" }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute right-[8%] bottom-0 size-[34%]"
      >
        <polygon
          points="50,6 96,94 4,94"
          fill="var(--c-surface)"
          stroke="var(--c-text)"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="overflow-hidden bg-t-bg">
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-14 md:grid md:grid-cols-[1.2fr_1fr] md:items-center md:gap-10 md:pt-16 md:pb-20">
      <div>
        <div className="flex items-center gap-3">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark name={data.name} logoUrl={data.logo.url} shape={theme.logo.shape} />
          ) : null}
          <p className="min-w-0 truncate font-t-display text-lg font-extrabold">{data.name}</p>
        </div>
        <p className="mt-6 inline-block rounded-full px-3 py-1 text-sm font-bold" style={BLOCK}>
          {data.segmentLabel}
        </p>
        <h1 className="mt-5 font-t-display text-[2.6rem] leading-[0.98] font-extrabold tracking-tight md:text-6xl">
          {data.headline || defaultHeadline(data.name)}
        </h1>
        <p className="mt-4 text-lg text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
        <CtaLink className="mt-8 w-full sm:w-auto" />
      </div>
      <div className="mt-12 md:mt-0">
        <Shapes coverUrl={data.coverUrl} name={data.name} />
      </div>
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona" alt>
    <Title title="Como funciona" />
    <ol className="grid gap-5 md:grid-cols-3">
      {[
        "Escolha o serviço",
        "Escolha dia e hora",
        data.automaticMessages ? "Confirmação no WhatsApp" : "Pronto, marcado!",
      ].map((t, i) => (
        <li
          key={t}
          className="flex items-center gap-4 rounded-[var(--radius-card)] bg-t-bg p-5"
          style={BLOCK}
        >
          <span
            className={`inline-flex size-12 shrink-0 items-center justify-center font-t-display text-xl font-extrabold ${["rounded-full", "rounded-md", "rounded-[40%_60%_60%_40%]"][i]}`}
            style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
          >
            {i + 1}
          </span>
          <p className="font-bold">{t}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title title="Serviços" />
    <ul className="grid gap-6 sm:grid-cols-2">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex h-full flex-col rounded-[var(--radius-card)] bg-t-surface p-5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            style={BLOCK}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-t-display text-xl font-extrabold">{s.name}</p>
              <span
                className="shrink-0 rounded-full px-3 py-1 font-t-display font-extrabold"
                style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
              >
                {formatPrice(s.price_cents)}
              </span>
            </div>
            {s.is_featured ? (
              <p
                className="mt-1 text-xs font-extrabold uppercase"
                style={{ color: "var(--c-link)" }}
              >
                Mais pedido
              </p>
            ) : null}
            {s.description ? <p className="mt-2 text-t-sub">{s.description}</p> : null}
            <p className="mt-auto pt-4 text-sm font-semibold text-t-sub">
              {formatDuration(s.duration_min)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe" alt>
    <Title title={data.staff.length === 1 ? "Quem atende" : "A equipe"} />
    <ul className="flex flex-wrap gap-6">
      {data.staff.map((p) => (
        <li key={p.id} className="w-36">
          <span className="block rounded-[var(--radius-card)]" style={BLOCK}>
            <ThemedAvatar
              name={p.name}
              url={p.photo_url}
              size={140}
              className="size-full! rounded-[var(--radius-card)]"
            />
          </span>
          <p className="mt-3 font-extrabold">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos">
    <Title title="Quem já veio" />
    <RatingLine data={data} />
    <ul className="grid gap-6 md:grid-cols-2">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="h-full rounded-[var(--radius-card)] bg-t-surface p-5" style={BLOCK}>
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote className="mt-1 text-lg font-semibold">{t.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-t-sub">— {t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

export const pop: TemplateDefinition = {
  meta: POP_META,
  sections: { hero, how, services, team, testimonials },
};
