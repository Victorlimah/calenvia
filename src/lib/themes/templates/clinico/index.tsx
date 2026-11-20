/**
 * Clínico (CAL-145): branco e azul/verde-água, limpo, muito respiro, ícones simples e selos de
 * confiança. Para clínica, consultório, psicologia e fisioterapia.
 */
import Link from "next/link";
import { BusinessMark } from "@/components/negocio/business-mark";
import { defaultHeadline, DEFAULT_SUBHEADLINE } from "@/components/negocio/hero";
import {
  CtaLink,
  IconCalendar,
  IconChat,
  IconCheck,
  IconClock,
  IconShield,
  Stars,
  ThemedAvatar,
} from "@/components/negocio/kit";
import { RatingLine } from "@/components/negocio/base-sections";
import type { SectionComponent, TemplateDefinition } from "@/components/negocio/template-types";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { CLINICO_META } from "../../template-meta";

function Title({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="text-sm font-bold" style={{ color: "var(--c-link)" }}>
        {kicker}
      </p>
      <h2 className="mt-2 font-t-display text-3xl leading-tight font-extrabold md:text-4xl">
        {title}
      </h2>
      {sub ? <p className="mt-3 text-lg text-t-sub">{sub}</p> : null}
    </div>
  );
}

function Wrap({ id, alt, children }: { id: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={alt ? "bg-t-surface" : ""}>
      <div className="mx-auto max-w-5xl px-5 py-[calc(4rem*var(--density,1))] md:py-[calc(6rem*var(--density,1))]">
        {children}
      </div>
    </section>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex size-12 items-center justify-center rounded-[var(--radius-control)]"
      style={{ background: "var(--c-primary-soft)", color: "var(--c-link)" }}
    >
      {children}
    </span>
  );
}

const BADGES = [
  { icon: IconCalendar, text: "Agende 24 horas por dia" },
  { icon: IconChat, text: "Confirmação no WhatsApp" },
  { icon: IconShield, text: "Sem cadastro e sem senha" },
];

/** Desenho próprio (sem foto): cruz suave, calendário e pontos, nas cores do tema. */
function CareIllustration() {
  return (
    <svg viewBox="0 0 320 260" aria-hidden="true" className="size-full">
      <rect width="320" height="260" rx="24" fill="var(--c-primary-soft)" />
      <circle cx="250" cy="60" r="70" fill="var(--c-primary)" fillOpacity="0.08" />
      <rect x="70" y="70" width="160" height="130" rx="18" fill="var(--c-surface)" />
      <rect x="70" y="70" width="160" height="34" rx="18" fill="var(--c-primary)" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}${r}`}
            x={88 + c * 36}
            y={118 + r * 26}
            width="22"
            height="16"
            rx="5"
            fill="var(--c-primary)"
            fillOpacity={c === 2 && r === 1 ? 0.9 : 0.15}
          />
        )),
      )}
      <path
        d="M250 150h16v-16h14v16h16v14h-16v16h-14v-16h-16z"
        fill="var(--c-primary)"
        fillOpacity="0.5"
      />
    </svg>
  );
}

const hero: SectionComponent = ({ data, theme }) => (
  <section className="bg-t-bg">
    <div className="mx-auto max-w-5xl px-5 pt-8 pb-14 md:grid md:grid-cols-[1.15fr_1fr] md:items-center md:gap-12 md:pt-16 md:pb-20">
      <div>
        <div className="flex items-center gap-3">
          {data.logo.placements.includes("hero") ? (
            <BusinessMark name={data.name} logoUrl={data.logo.url} shape={theme.logo.shape} />
          ) : null}
          <div className="min-w-0">
            <p className="truncate font-t-display text-lg font-extrabold">{data.name}</p>
            <p className="text-sm text-t-sub">{data.segmentLabel}</p>
          </div>
        </div>
        <h1 className="mt-8 font-t-display text-[2.3rem] leading-[1.1] font-extrabold tracking-tight md:text-5xl">
          {data.headline || defaultHeadline(data.name)}
        </h1>
        <p className="mt-4 text-lg text-t-sub">{data.subheadline || DEFAULT_SUBHEADLINE}</p>
        <CtaLink className="mt-8 w-full sm:w-auto" />
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {BADGES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-sm font-semibold">
              <span style={{ color: "var(--c-link)" }}>
                <Icon />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 aspect-[32/26] overflow-hidden rounded-[var(--radius-card)] md:mt-0">
        {data.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coverUrl}
            alt={`Ambiente da ${data.name}`}
            className="size-full object-cover"
            fetchPriority="high"
          />
        ) : (
          <CareIllustration />
        )}
      </div>
    </div>
  </section>
);

const how: SectionComponent = ({ data }) => (
  <Wrap id="como-funciona" alt>
    <Title kicker="Como funciona" title="Marque sua consulta em 3 passos" />
    <ol className="grid gap-6 md:grid-cols-3">
      {[
        { Icon: IconCheck, t: "Escolha o atendimento", d: "Duração e valor aparecem antes." },
        { Icon: IconCalendar, t: "Escolha dia e horário", d: "Só horários realmente livres." },
        {
          Icon: IconChat,
          t: "Receba a confirmação",
          d: data.automaticMessages
            ? "Chega no seu WhatsApp, com lembrete."
            : "Seu horário fica reservado na agenda.",
        },
      ].map(({ Icon, t, d }) => (
        <li key={t} className="rounded-[var(--radius-card)] bg-t-bg p-6">
          <IconBubble>
            <Icon className="size-6" />
          </IconBubble>
          <p className="mt-4 font-t-display text-lg font-bold">{t}</p>
          <p className="mt-1 text-t-sub">{d}</p>
        </li>
      ))}
    </ol>
  </Wrap>
);

const services: SectionComponent = ({ data }) => (
  <Wrap id="servicos">
    <Title kicker="Atendimentos" title="Escolha o atendimento" />
    <ul className="grid gap-4 md:grid-cols-2">
      {data.services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="flex h-full flex-col rounded-[var(--radius-card)] border border-t-border bg-t-surface p-6 transition-shadow hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-t-display text-lg font-bold">{s.name}</p>
              {s.is_featured ? (
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
                >
                  Mais pedido
                </span>
              ) : null}
            </div>
            {s.description ? <p className="mt-2 text-t-sub">{s.description}</p> : null}
            <div className="mt-auto flex items-center justify-between gap-3 pt-5">
              <span className="flex items-center gap-1.5 text-sm text-t-sub">
                <IconClock className="size-4" />
                {formatDuration(s.duration_min)}
              </span>
              <span className="font-t-display text-lg font-bold">{formatPrice(s.price_cents)}</span>
            </div>
            <span className="mt-3 text-sm font-bold" style={{ color: "var(--c-link)" }}>
              Agendar este atendimento <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </Wrap>
);

const team: SectionComponent = ({ data }) => (
  <Wrap id="equipe" alt>
    <Title
      kicker="Equipe"
      title={data.staff.length === 1 ? "Quem vai atender você" : "Profissionais"}
    />
    <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {data.staff.map((p) => (
        <li key={p.id} className="flex items-center gap-4 rounded-[var(--radius-card)] bg-t-bg p-4">
          <ThemedAvatar
            name={p.name}
            url={p.photo_url}
            size={72}
            className="rounded-[var(--radius-control)]"
          />
          <div className="min-w-0">
            <p className="font-t-display font-bold">{p.name}</p>
            {p.role ? <p className="text-sm text-t-sub">{p.role}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  </Wrap>
);

const testimonials: SectionComponent = ({ data }) => (
  <Wrap id="depoimentos">
    <Title kicker="Avaliações" title="O que dizem os pacientes" />
    <RatingLine data={data} />
    <ul className="grid gap-4 md:grid-cols-2">
      {data.testimonials.map((t) => (
        <li key={t.id}>
          <figure className="h-full rounded-[var(--radius-card)] border border-t-border bg-t-surface p-6">
            {t.rating ? <Stars rating={t.rating} /> : null}
            <blockquote className="mt-2 text-lg">{t.text}</blockquote>
            <figcaption className="mt-4 text-sm font-bold text-t-sub">{t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </Wrap>
);

const final: SectionComponent = () => (
  <section className="px-5 py-16">
    <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-[var(--radius-card)] bg-t-surface p-8 md:flex-row md:items-center md:justify-between md:p-12">
      <div>
        <h2 className="font-t-display text-3xl leading-tight font-extrabold">
          Pronto para marcar seu horário?
        </h2>
        <p className="mt-2 text-t-sub">Escolha o dia e a hora em menos de um minuto.</p>
      </div>
      <CtaLink className="w-full shrink-0 md:w-auto" />
    </div>
  </section>
);

export const clinico: TemplateDefinition = {
  meta: CLINICO_META,
  sections: { hero, how, services, team, testimonials, final },
};
