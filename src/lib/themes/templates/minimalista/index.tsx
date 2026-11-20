/**
 * Minimalista (CAL-146): só tipografia e linhas finas, sem enfeites. Para psicologia,
 * consultórios e quem prefere o essencial.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { MINIMALISTA_META } from "../../template-meta";

/** Seção em duas colunas no computador: rótulo à esquerda, conteúdo à direita, fio em cima. */
function Row({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <div className="mx-auto max-w-4xl px-5 py-[calc(3rem*var(--density,1))] md:py-[calc(4rem*var(--density,1))]">
        <div
          className="grid gap-4 border-t pt-6 md:grid-cols-[180px_1fr] md:gap-10"
          style={{ borderColor: "var(--c-border)" }}
        >
          <h2 className="text-sm font-semibold text-t-sub">{label}</h2>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="bg-t-bg">
    <div className="mx-auto max-w-4xl px-5 pt-10 pb-12 md:pt-20 md:pb-16">
      <div className="flex items-center gap-3">
        {data.logo.placements.includes("hero") ? (
          <BusinessMark
            name={data.name}
            logoUrl={data.logo.url}
            shape={theme.logo.shape}
            size="sm"
          />
        ) : null}
        <p className="font-semibold">{data.name}</p>
        <span aria-hidden="true" className="h-px w-6" style={{ background: "var(--c-border)" }} />
        <p className="text-sm text-t-sub">{data.segmentLabel}</p>
      </div>
      <h1 className="mt-14 max-w-3xl font-t-display text-[2.2rem] leading-[1.1] font-semibold tracking-tight md:text-5xl">
        {data.headline || defaultHeadline(data.name)}
      </h1>
      <p className="mt-5 max-w-xl text-lg text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
      <CtaLink className="mt-10 w-full sm:w-auto" />
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Row id="como-funciona" label="Como funciona">
    <ol className="space-y-3 text-lg">
      <li>1. Escolha o atendimento.</li>
      <li>2. Escolha um horário livre.</li>
      <li>
        3.{" "}
        {data.automaticMessages
          ? "Receba a confirmação no WhatsApp."
          : "Pronto, horário reservado."}
      </li>
    </ol>
  </Row>
);

const services: SectionComponent = ({ data }) => (
  <Row id="servicos" label="Atendimentos">
    <ul>
      {data.services.map((s) => (
        <li
          key={s.id}
          className="border-b last:border-b-0"
          style={{ borderColor: "var(--c-border)" }}
        >
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex items-baseline gap-4 py-4 hover:opacity-70"
          >
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">
                {s.name}
                {s.is_featured ? (
                  <span className="ml-2 text-sm font-normal text-t-sub">(mais pedido)</span>
                ) : null}
              </p>
              {s.description ? <p className="text-t-sub">{s.description}</p> : null}
            </div>
            <p className="shrink-0 text-right text-t-sub">
              {formatDuration(s.duration_min)}
              <br />
              <span className="font-semibold text-t-text">{formatPrice(s.price_cents)}</span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  </Row>
);

const team: SectionComponent = ({ data }) => (
  <Row id="equipe" label={data.staff.length === 1 ? "Quem atende" : "Equipe"}>
    <ul className="space-y-2 text-lg">
      {data.staff.map((p) => (
        <li key={p.id}>
          <span className="font-semibold">{p.name}</span>
          {p.role ? <span className="text-t-sub"> — {p.role}</span> : null}
        </li>
      ))}
    </ul>
  </Row>
);

const gallery: SectionComponent = ({ data }) => (
  <Row id="trabalho" label="Fotos">
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {data.photos.map((p) => (
        <li key={p.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt={p.caption ?? `Foto da ${data.name}`}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
        </li>
      ))}
    </ul>
  </Row>
);

const testimonials: SectionComponent = ({ data }) => (
  <Row id="depoimentos" label="Depoimentos">
    <RatingLine data={data} />
    <ul className="space-y-6">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure>
            <blockquote className="text-lg">“{t.text}”</blockquote>
            <figcaption className="mt-1 text-sm text-t-sub">
              {t.author_name}
              {t.rating ? ` · nota ${t.rating}` : ""}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Row>
);

const final: SectionComponent = () => (
  <section className="px-5 py-16">
    <div className="mx-auto max-w-4xl border-t pt-10" style={{ borderColor: "var(--c-border)" }}>
      <h2 className="font-t-display text-3xl font-semibold">Vamos marcar?</h2>
      <CtaLink className="mt-6 w-full sm:w-auto" />
    </div>
  </section>
);

export const minimalista: TemplateDefinition = {
  meta: MINIMALISTA_META,
  sections: { hero, how, services, team, gallery, testimonials, final },
};
