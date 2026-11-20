/**
 * Editorial (CAL-146): cara de revista — títulos enormes, fios pretos, preto e branco com um
 * toque de cor. Fotos em preto e branco que ganham cor ao passar o dedo/mouse.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { EDITORIAL_META } from "../../template-meta";

function Rule() {
  return <hr className="border-0 border-t-4" style={{ borderColor: "var(--c-text)" }} />;
}

function Title({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-8">
      <Rule />
      <div className="mt-3 flex items-baseline gap-4">
        <span className="text-sm font-bold" style={{ color: "var(--c-link)" }}>
          {n}
        </span>
        <h2 className="font-t-display text-4xl leading-none md:text-6xl">{title}</h2>
      </div>
    </div>
  );
}

function Wrap({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="mx-auto max-w-5xl px-5 py-[calc(3.5rem*var(--density,1))] md:py-[calc(5rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="bg-t-bg">
    <div className="mx-auto max-w-5xl px-5 pt-6 pb-12 md:pt-10">
      <div
        className="flex items-center justify-between gap-3 border-b pb-3"
        style={{ borderColor: "var(--c-text)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark
              name={data.name}
              logoUrl={data.logo.url}
              shape={theme.logo.shape}
              size="sm"
            />
          ) : null}
          <p className="truncate text-sm font-bold tracking-[0.2em] uppercase">{data.name}</p>
        </div>
        <p className="shrink-0 text-xs font-semibold tracking-widest text-t-sub uppercase">
          {data.segmentLabel}
        </p>
      </div>
      <h1 className="mt-8 font-t-display text-[2.9rem] leading-[0.95] tracking-tight md:text-[5.5rem]">
        {data.headline || defaultHeadline(data.name)}
      </h1>
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <p className="max-w-xl text-lg text-t-sub md:text-xl">
          <span className="font-bold" style={{ color: "var(--c-link)" }}>
            —{" "}
          </span>
          {data.subheadline || DEFAULT_SUBHEADLINE}
        </p>
        <CtaLink className="w-full md:w-auto" />
      </div>
      {data.coverUrl ? (
        <figure className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.coverUrl}
            alt={`Foto da ${data.name}`}
            className="aspect-[16/9] w-full object-cover grayscale transition hover:grayscale-0"
            fetchPriority="high"
          />
          <figcaption className="mt-2 text-xs tracking-widest text-t-sub uppercase">
            {data.name} · {data.segmentLabel}
          </figcaption>
        </figure>
      ) : (
        <div aria-hidden="true" className="mt-10 grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="h-3"
              style={{
                background: i === 4 ? "var(--c-primary)" : "var(--c-text)",
                opacity: i === 4 ? 1 : 0.85 - i * 0.12,
              }}
            />
          ))}
        </div>
      )}
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona">
    <Title n="00" title="Como funciona" />
    <ol className="grid gap-6 md:grid-cols-3">
      {[
        ["Escolha o serviço", "Duração e valor antes de marcar."],
        ["Escolha o horário", "Só aparecem horários livres."],
        [
          "Pronto",
          data.automaticMessages ? "A confirmação chega no WhatsApp." : "Horário reservado.",
        ],
      ].map(([t, d], i) => (
        <li key={t} className="border-t pt-4" style={{ borderColor: "var(--c-border)" }}>
          <p className="font-t-display text-5xl leading-none" style={{ color: "var(--c-link)" }}>
            {i + 1}.
          </p>
          <p className="mt-3 text-lg font-bold">{t}</p>
          <p className="text-t-sub">{d}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title n="01" title="Serviços" />
    <ol className="grid gap-x-10 md:grid-cols-2">
      {data.services.map((s, i) => (
        <li key={s.id} className="border-b border-t-border">
          <Link href={`/agendar?servico=${s.id}`} className="flex gap-4 py-5 hover:opacity-80">
            <span
              className="font-t-display text-3xl leading-none"
              style={{ color: "var(--c-link)" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">
                {s.name}
                {s.is_featured ? (
                  <span
                    className="ml-2 text-xs font-bold tracking-widest uppercase"
                    style={{ color: "var(--c-link)" }}
                  >
                    · mais pedido
                  </span>
                ) : null}
              </p>
              {s.description ? <p className="mt-1 text-sm text-t-sub">{s.description}</p> : null}
              <p className="mt-1 text-sm text-t-sub">
                {formatDuration(s.duration_min)} ·{" "}
                <span className="font-bold text-t-text">{formatPrice(s.price_cents)}</span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe">
    <Title n="02" title="Equipe" />
    <ul className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {data.staff.map((p) => (
        <li key={p.id}>
          <ThemedAvatar
            name={p.name}
            url={p.photo_url}
            size={160}
            className="aspect-square h-auto! w-full! rounded-none grayscale"
          />
          <p className="mt-3 font-bold">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos">
    <Title n="03" title="Dizem por aí" />
    <RatingLine data={data} />
    <ul className="space-y-10">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="border-l-4 pl-5" style={{ borderColor: "var(--c-primary)" }}>
            <blockquote className="font-t-display text-2xl leading-snug md:text-3xl">
              “{t.text}”
            </blockquote>
            <figcaption className="mt-3 text-sm font-bold tracking-widest text-t-sub uppercase">
              {t.author_name}
              {t.rating ? ` · ${t.rating}/5` : ""}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="px-5 py-16">
    <div className="mx-auto max-w-5xl">
      <Rule />
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <h2 className="font-t-display text-5xl leading-none md:text-7xl">Sua vez.</h2>
        <CtaLink className="w-full md:w-auto" />
      </div>
    </div>
  </section>
);

export const editorial: TemplateDefinition = {
  meta: EDITORIAL_META,
  sections: { hero, how, services, team, testimonials, final },
};
