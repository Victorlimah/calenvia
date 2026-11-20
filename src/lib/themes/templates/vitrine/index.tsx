/**
 * Vitrine (CAL-145): grade de fotos grande, estilo portfólio/Instagram, texto enxuto.
 * Para nail designer, maquiagem, sobrancelha e tatuagem.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, IconSparkle, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { VITRINE_META } from "../../template-meta";

function Title({ title, count }: { title: string; count?: string }) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-3 border-b border-t-border pb-3">
      <h2 className="font-t-display text-2xl font-extrabold tracking-tight uppercase md:text-3xl">
        {title}
      </h2>
      {count ? <p className="text-sm text-t-sub">{count}</p> : null}
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-5xl px-4 py-[calc(3rem*var(--density,1))] md:py-[calc(4.5rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

/** Quadro sem foto: blocos de cor do tema com um brilho (a página fica bonita sem fotos). */
function Tile({ i }: { i: number }) {
  const soft = i % 3 !== 1;
  return (
    <div
      aria-hidden="true"
      className="flex size-full items-center justify-center"
      style={{
        background: soft ? "var(--c-primary-soft)" : "var(--c-primary)",
        color: soft ? "var(--c-link)" : "var(--c-primary-fg)",
      }}
    >
      <IconSparkle className={i === 0 ? "size-16" : "size-8"} />
    </div>
  );
}

const hero: SectionComponent = ({ data, theme }) => {
  const photos = [
    ...(data.coverUrl ? [{ id: "capa", url: data.coverUrl, caption: null }] : []),
    ...data.photos,
  ].slice(0, 5);
  const cells = Array.from({ length: 5 }, (_, i) => photos[i] ?? null);
  return (
    <section className="bg-t-bg">
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 md:pt-12">
        <div className="flex items-center gap-3">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark
              name={data.name}
              logoUrl={data.logo.url}
              shape={theme.logo.shape}
              size="lg"
            />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-t-display text-xl font-extrabold">{data.name}</p>
            <p className="text-sm text-t-sub">{data.segmentLabel}</p>
          </div>
        </div>
        <div className="mt-6 md:flex md:items-end md:justify-between md:gap-10">
          <div className="max-w-xl">
            <h1 className="font-t-display text-[2.1rem] leading-[1.05] font-extrabold tracking-tight md:text-5xl">
              {data.headline || defaultHeadline(data.name)}
            </h1>
            <p className="mt-3 text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
          </div>
          <CtaLink className="mt-6 w-full shrink-0 md:mt-0 md:w-auto" />
        </div>
        <ul
          className="mt-8 grid grid-cols-3 gap-1.5 md:grid-cols-4 md:gap-2"
          aria-label="Trabalhos"
        >
          {cells.map((p, i) => (
            <li
              key={p?.id ?? `t${i}`}
              className={
                i === 0
                  ? "col-span-2 row-span-2 aspect-square overflow-hidden rounded-[var(--radius-card)]"
                  : `aspect-square overflow-hidden rounded-[var(--radius-card)] ${i > 2 ? "hidden md:block" : ""}`
              }
            >
              {p ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={p.caption ?? `Trabalho da ${data.name}`}
                  className="size-full object-cover"
                  fetchPriority={i === 0 ? "high" : undefined}
                />
              ) : (
                <Tile i={i} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const gallery: SectionComponent = ({ data }) => (
  <Wrap id="trabalho">
    <Title title="Portfólio" count={`${data.photos.length} fotos`} />
    <ul className="grid grid-cols-3 gap-1 md:gap-2">
      {data.photos.map((p) => (
        <li
          key={p.id}
          className="aspect-square overflow-hidden rounded-[calc(var(--radius-card)/2)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt={p.caption ?? `Trabalho da ${data.name}`}
            loading="lazy"
            className="size-full object-cover"
          />
        </li>
      ))}
    </ul>
  </Wrap>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona" alt>
    <Title title="Como agendar" />
    <ol className="grid gap-3 md:grid-cols-3">
      {[
        "Escolha o serviço",
        "Escolha dia e horário livres",
        data.automaticMessages ? "Receba a confirmação no WhatsApp" : "Pronto, horário reservado",
      ].map((t, i) => (
        <li key={t} className="flex items-center gap-3 font-semibold">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full font-t-display font-extrabold"
            style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
          >
            {i + 1}
          </span>
          {t}
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title title="Serviços" count={`${data.services.length}`} />
    <ul className="grid gap-x-8 md:grid-cols-2">
      {data.services.map((s) => (
        <li key={s.id} className="border-b border-t-border">
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex items-center gap-3 py-4 transition-opacity hover:opacity-80"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {s.name}
                {s.is_featured ? (
                  <span
                    className="ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold uppercase"
                    style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
                  >
                    Mais pedido
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-t-sub">
                {formatDuration(s.duration_min)}
                {s.description ? ` · ${s.description}` : ""}
              </p>
            </div>
            <p className="font-t-display font-extrabold">{formatPrice(s.price_cents)}</p>
            <span aria-hidden="true" style={{ color: "var(--c-link)" }}>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe">
    <Title title={data.staff.length === 1 ? "Quem faz" : "Quem faz"} />
    <ul className="flex flex-wrap gap-6">
      {data.staff.map((p) => (
        <li key={p.id} className="flex items-center gap-3">
          <ThemedAvatar name={p.name} url={p.photo_url} size={64} />
          <div>
            <p className="font-bold">{p.name}</p>
            {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos" alt>
    <Title title="Clientes" />
    <RatingLine data={data} />
    <ul className="grid gap-3 md:grid-cols-3">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure
            className="h-full border-l-4 bg-t-bg p-5"
            style={{ borderColor: "var(--c-primary)" }}
          >
            {t.rating ? <Stars rating={t.rating} className="text-sm" /> : null}
            <blockquote className="mt-1">{t.text}</blockquote>
            <figcaption className="mt-3 text-sm font-bold text-t-sub">{t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

export const vitrine: TemplateDefinition = {
  meta: VITRINE_META,
  sections: { hero, gallery, how, services, team, testimonials },
};
