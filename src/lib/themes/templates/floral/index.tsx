/**
 * Floral (CAL-146): romântico, tons pastel e detalhes botânicos em SVG próprio, títulos
 * manuscritos. Para noivas, estética, salão e manicure.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import { CtaLink, Stars, ThemedAvatar } from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { FLORAL_META } from "../../template-meta";

/** Flor simples (5 pétalas) nas cores do tema. */
function Flower({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse
          key={r}
          cx="20"
          cy="10"
          rx="6"
          ry="9"
          fill="var(--c-primary)"
          fillOpacity="0.35"
          transform={`rotate(${r} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="4.5" fill="var(--c-primary)" />
    </svg>
  );
}

/** Ramo com folhas (divisor). */
function Branch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 24" aria-hidden="true" className={`h-6 w-40 ${className}`}>
      <path d="M4 12h152" stroke="var(--c-border)" strokeWidth="1.5" />
      {[30, 60, 100, 130].map((x, i) => (
        <ellipse
          key={x}
          cx={x}
          cy={i % 2 ? 16 : 8}
          rx="7"
          ry="3.5"
          fill="var(--c-primary)"
          fillOpacity="0.4"
          transform={`rotate(${i % 2 ? 25 : -25} ${x} ${i % 2 ? 16 : 8})`}
        />
      ))}
      <circle cx="80" cy="12" r="4" fill="var(--c-primary)" />
    </svg>
  );
}

function Title({ title }: { title: string }) {
  return (
    <div className="mb-10 text-center">
      <h2 className="font-t-display text-5xl leading-tight md:text-6xl">{title}</h2>
      <Branch className="mx-auto mt-2" />
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-3xl px-5 py-[calc(3.5rem*var(--density,1))] md:py-[calc(5rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="relative overflow-hidden bg-t-bg">
    <Flower className="absolute top-6 left-4 size-16 rotate-12 md:size-24" />
    <Flower className="absolute right-6 bottom-10 hidden size-20 -rotate-12 md:block" />
    <div className="relative mx-auto max-w-4xl px-5 pt-12 pb-16 text-center md:pt-16 md:pb-24">
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
      <p className="mt-4 font-t-display text-3xl">{data.name}</p>
      <p className="text-sm font-semibold text-t-sub">{data.segmentLabel}</p>
      {data.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.coverUrl}
          alt={`Foto da ${data.name}`}
          className="mx-auto mt-8 aspect-[4/5] w-56 rounded-[50%] object-cover md:w-64"
          style={{ boxShadow: "0 0 0 6px var(--c-surface), 0 0 0 7px var(--c-border)" }}
          fetchPriority="high"
        />
      ) : (
        <Branch className="mx-auto mt-6" />
      )}
      <h1 className="mx-auto mt-8 max-w-2xl font-t-display text-[2.7rem] leading-[1.05] md:text-7xl">
        {data.headline || defaultHeadline(data.name)}
      </h1>
      <p className="mx-auto mt-5 max-w-md text-lg text-t-sub">
        {data.subheadline || DEFAULT_SUBHEADLINE}
      </p>
      <CtaLink className="mt-8 w-full sm:w-auto" />
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona" alt>
    <Title title="Como funciona" />
    <ol className="grid gap-6 text-center md:grid-cols-3">
      {[
        "Escolha o serviço",
        "Escolha o dia e a hora",
        data.automaticMessages ? "Receba a confirmação no WhatsApp" : "Seu horário fica reservado",
      ].map((t, i) => (
        <li key={t}>
          <span className="relative mx-auto flex size-16 items-center justify-center">
            <Flower className="absolute inset-0 size-16" />
            <span className="relative font-t-display text-2xl">{i + 1}</span>
          </span>
          <p className="mt-2 font-semibold">{t}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title title="Serviços" />
    <ul className="space-y-4">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex items-center gap-4 rounded-[var(--radius-card)] bg-t-surface p-5 hover:opacity-90"
            style={{ border: "1px solid var(--c-border)" }}
          >
            <Flower className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">
                {s.name}
                {s.is_featured ? (
                  <span className="ml-2 text-xs font-bold" style={{ color: "var(--c-link)" }}>
                    ♥ mais pedido
                  </span>
                ) : null}
              </p>
              {s.description ? <p className="text-sm text-t-sub">{s.description}</p> : null}
              <p className="text-sm text-t-sub">{formatDuration(s.duration_min)}</p>
            </div>
            <p className="font-bold">{formatPrice(s.price_cents)}</p>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe" alt>
    <Title title={data.staff.length === 1 ? "Quem cuida de você" : "Nossa equipe"} />
    <ul className="flex flex-wrap justify-center gap-8">
      {data.staff.map((p) => (
        <li key={p.id} className="w-36 text-center">
          <ThemedAvatar name={p.name} url={p.photo_url} size={120} className="rounded-[50%]" />
          <p className="mt-3 font-t-display text-2xl">{p.name}</p>
          {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos">
    <Title title="Com carinho" />
    <div className="text-center">
      <RatingLine data={data} />
    </div>
    <ul className="space-y-8">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="text-center">
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote className="mx-auto mt-1 max-w-xl text-lg">“{t.text}”</blockquote>
            <figcaption className="mt-2 font-t-display text-2xl">{t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="relative px-5 py-20 text-center">
    <Flower className="mx-auto size-14" />
    <h2 className="mt-4 font-t-display text-5xl leading-tight md:text-6xl">Esperamos você</h2>
    <CtaLink className="mt-8 w-full sm:w-auto" />
  </section>
);

export const floral: TemplateDefinition = {
  meta: FLORAL_META,
  sections: { hero, how, services, team, testimonials, final },
};
