/**
 * Alegre (CAL-145): cores vivas, cantos bem arredondados, adesivos e ícones divertidos, tom
 * informal. Para pet shop, lava-jato, estúdio infantil e personal.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import {
  CtaLink,
  IconCalendar,
  IconHeart,
  IconSparkle,
  IconStar,
  Stars,
  ThemedAvatar,
} from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { ALEGRE_META } from "../../template-meta";

/** Adesivo inclinado (sempre com contraste garantido: cor principal + texto dela). */
function Sticker({
  children,
  tilt,
  soft,
  className = "",
}: {
  children: React.ReactNode;
  tilt: number;
  soft?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-extrabold shadow-md ${className}`}
      style={{
        transform: `rotate(${tilt}deg)`,
        background: soft ? "var(--c-surface)" : "var(--c-primary)",
        color: soft ? "var(--c-text)" : "var(--c-primary-fg)",
      }}
    >
      {children}
    </span>
  );
}

function Title({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <h2 className="mb-8 flex items-center gap-3 font-t-display text-3xl leading-tight font-extrabold md:text-4xl">
      <span
        aria-hidden="true"
        className="inline-flex size-11 shrink-0 -rotate-6 items-center justify-center rounded-2xl"
        style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
      >
        {icon ?? <IconStar />}
      </span>
      {title}
    </h2>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="px-3 py-2">
      <div
        className={`mx-auto max-w-5xl rounded-[var(--radius-card)] px-5 py-[calc(3rem*var(--density,1))] md:px-10 md:py-[calc(4.5rem*var(--density,1))] ${alt ? "bg-t-surface" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="px-3 pt-3">
    <div
      className="relative mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-card)] px-5 pt-8 pb-12 md:px-12 md:pt-14 md:pb-16"
      style={{ background: "var(--c-primary-soft)" }}
    >
      <div
        aria-hidden="true"
        className="absolute -right-10 -bottom-10 size-48 rounded-full md:size-72"
        style={{ background: "var(--c-primary)", opacity: 0.18 }}
      />
      <div
        aria-hidden="true"
        className="absolute top-6 right-6 hidden md:block"
        style={{ color: "var(--c-link)" }}
      >
        <IconSparkle className="size-12" />
      </div>
      <div className="relative md:grid md:grid-cols-[1.5fr_1fr] md:items-center md:gap-10">
        <div>
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
              <p className="text-sm font-semibold text-t-sub">{data.segmentLabel}</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-2xl font-t-display text-[2.4rem] leading-[1.05] font-extrabold tracking-tight md:text-6xl">
            {data.headline || defaultHeadline(data.name)}
          </h1>
          <p className="mt-4 max-w-xl text-lg">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Sticker tilt={-4}>
              <IconCalendar className="size-4" /> Agende em 1 minuto
            </Sticker>
            <Sticker tilt={3} soft>
              <IconHeart className="size-4" /> Sem fila, sem ligação
            </Sticker>
          </div>
          <CtaLink className="mt-8 w-full text-lg shadow-lg sm:w-auto" />
        </div>
        <div className="mt-10 hidden md:mt-0 md:block">
          {data.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.coverUrl}
              alt={`Foto da ${data.name}`}
              className="aspect-square w-full rotate-2 rounded-[var(--radius-card)] object-cover shadow-xl"
            />
          ) : (
            <div aria-hidden="true" className="relative aspect-square w-full">
              <div
                className="absolute inset-6 rotate-6 rounded-[var(--radius-card)] shadow-xl"
                style={{ background: "var(--c-primary)" }}
              />
              <div className="absolute inset-6 flex -rotate-3 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] bg-t-surface shadow-xl">
                <span style={{ color: "var(--c-link)" }}>
                  <IconCalendar className="size-20" />
                </span>
                <span className="flex gap-2" style={{ color: "var(--c-link)" }}>
                  <IconStar className="size-7" />
                  <IconHeart className="size-7" />
                  <IconSparkle className="size-7" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona">
    <Title title="Bem fácil de marcar" icon={<IconSparkle />} />
    <ol className="grid gap-4 md:grid-cols-3">
      {[
        "Escolha o serviço",
        "Escolha dia e hora livres",
        data.automaticMessages ? "Receba a confirmação no WhatsApp" : "Pronto, está marcado!",
      ].map((t, i) => (
        <li
          key={t}
          className="flex items-center gap-4 rounded-[var(--radius-card)] bg-t-surface p-4"
        >
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full font-t-display text-xl font-extrabold"
            style={{
              background: "var(--c-primary)",
              color: "var(--c-primary-fg)",
              transform: `rotate(${[-8, 6, -4][i]}deg)`,
            }}
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
  <Wrap id="servicos" alt>
    <Title title="Serviços" />
    <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {data.services.map((s, i) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex h-full flex-col rounded-[var(--radius-card)] border-2 border-t-border bg-t-bg p-5 transition-transform hover:-rotate-1"
          >
            <span
              aria-hidden="true"
              className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl"
              style={{ background: "var(--c-primary-soft)", color: "var(--c-link)" }}
            >
              {[<IconStar key="s" />, <IconHeart key="h" />, <IconSparkle key="p" />][i % 3]}
            </span>
            <p className="font-t-display text-lg font-extrabold">{s.name}</p>
            {s.is_featured ? (
              <p
                className="mt-1 text-xs font-extrabold uppercase"
                style={{ color: "var(--c-link)" }}
              >
                ★ Mais pedido
              </p>
            ) : null}
            {s.description ? <p className="mt-1 text-sm text-t-sub">{s.description}</p> : null}
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <span className="text-sm text-t-sub">{formatDuration(s.duration_min)}</span>
              <span
                className="rounded-full px-3 py-1 font-t-display font-extrabold"
                style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
              >
                {formatPrice(s.price_cents)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe">
    <Title title={data.staff.length === 1 ? "Quem atende" : "Nossa turma"} icon={<IconHeart />} />
    <ul className="flex flex-wrap gap-6">
      {data.staff.map((p, i) => (
        <li key={p.id} className="w-32 text-center">
          <span
            className="inline-block rounded-full p-1"
            style={{ background: "var(--c-primary)", transform: `rotate(${i % 2 ? 4 : -4}deg)` }}
          >
            <ThemedAvatar name={p.name} url={p.photo_url} size={104} />
          </span>
          <p className="mt-2 font-extrabold">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos" alt>
    <Title title="Quem vem, ama" icon={<IconHeart />} />
    <RatingLine data={data} />
    <ul className="grid gap-5 md:grid-cols-2">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure>
            <blockquote className="relative rounded-[var(--radius-card)] bg-t-bg p-5 text-lg font-semibold">
              {t.rating ? <Stars rating={t.rating} className="mb-1 text-base" /> : null}
              {t.text}
            </blockquote>
            <figcaption className="mt-2 ml-5 text-sm font-extrabold">— {t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="px-3 py-6">
    <div
      className="mx-auto max-w-5xl rounded-[var(--radius-card)] px-6 py-14 text-center"
      style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
    >
      <h2 className="font-t-display text-4xl leading-tight font-extrabold">Bora marcar?</h2>
      <p className="mt-3 font-semibold">Leva menos de um minuto, sem ligação.</p>
      <Link
        href="/agendar"
        className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] px-7 text-[17px] font-bold sm:w-auto"
        style={{ background: "var(--c-primary-fg)", color: "var(--c-primary)" }}
      >
        Agendar meu horário
      </Link>
    </div>
  </section>
);

export const alegre: TemplateDefinition = {
  meta: ALEGRE_META,
  sections: { hero, how, services, team, testimonials, final },
};
