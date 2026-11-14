import Link from "next/link";
import { Avatar } from "@/components/painel/staff-editor";
import { formatDuration, formatHourShort } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { readableTextOn } from "@/lib/color";
import type { PublicService, PublicStaff } from "@/lib/public/business";
import { WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/weekdays";

export function SectionTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <div className="mb-6">
      {kicker ? (
        <p
          className="text-sm font-bold tracking-wider uppercase"
          style={{ color: "var(--accent)" }}
        >
          {kicker}
        </p>
      ) : null}
      <h2 className="font-display mt-1 text-3xl leading-tight font-extrabold md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

export function Section({
  id,
  children,
  alt,
}: {
  id?: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section id={id} className={alt ? "bg-night-2" : ""}>
      <div className="mx-auto max-w-2xl px-5 py-14 md:py-20">{children}</div>
    </section>
  );
}

export function HowItWorks({ automatic }: { automatic: boolean }) {
  const steps = [
    { t: "Escolha o serviço", d: "Veja duração e preço antes de marcar." },
    { t: "Escolha o dia e o horário", d: "Só aparecem horários realmente livres." },
    {
      t: "Pronto, está marcado",
      d: automatic
        ? "A confirmação chega no seu WhatsApp."
        : "Seu horário fica garantido na agenda.",
    },
  ];
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map((s, i) => (
        <li
          key={s.t}
          className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5"
        >
          <span
            className="font-display inline-flex size-9 items-center justify-center rounded-full font-extrabold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            {i + 1}
          </span>
          <p className="font-display mt-3 text-lg font-bold">{s.t}</p>
          <p className="text-night-sub mt-1">{s.d}</p>
        </li>
      ))}
    </ol>
  );
}

export function ServicesList({ services }: { services: PublicService[] }) {
  return (
    <ul className="space-y-3">
      {services.map((s) => (
        <li key={s.id}>
          <Link
            href={`/agendar?servico=${s.id}`}
            className="group flex items-center gap-4 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5 transition-colors hover:border-white/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-lg font-bold">{s.name}</p>
                {s.is_featured ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                  >
                    Mais pedido
                  </span>
                ) : null}
              </div>
              {s.description ? (
                <p className="text-night-sub mt-1 text-sm">{s.description}</p>
              ) : null}
              <p className="text-night-sub mt-2 text-sm">{formatDuration(s.duration_min)}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold">{formatPrice(s.price_cents)}</p>
              <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Agendar <span aria-hidden="true">→</span>
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Gallery({
  photos,
  name,
}: {
  photos: { id: string; url: string; caption: string | null }[];
  name: string;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {photos.map((p, i) => (
        <li key={p.id} className={i === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt={p.caption ?? `Trabalho da ${name}`}
            loading="lazy"
            className="aspect-square size-full rounded-2xl object-cover"
          />
        </li>
      ))}
    </ul>
  );
}

export function Team({ staff }: { staff: PublicStaff[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {staff.map((p) => (
        <li
          key={p.id}
          className="flex flex-col items-center rounded-[var(--radius-card)] bg-white/5 p-5 text-center"
        >
          <Avatar name={p.name} url={p.photo_url} size={80} />
          <p className="font-display mt-3 font-bold">{p.name}</p>
          {p.role ? <p className="text-night-sub text-sm">{p.role}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function Testimonials({
  items,
}: {
  items: { id: string; author_name: string; text: string }[];
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((t) => (
        <li key={t.id}>
          <figure className="h-full rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-5">
            <p
              aria-hidden="true"
              className="font-display text-4xl leading-none"
              style={{ color: "var(--accent)" }}
            >
              “
            </p>
            <blockquote className="mt-1 text-lg">{t.text}</blockquote>
            <figcaption className="text-night-sub mt-3 font-semibold">— {t.author_name}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

type Hours = {
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};
type Break = { weekday: number; starts_at: string; ends_at: string };

export function hoursLines(hours: Hours[], breaks: Break[]) {
  return WEEKDAY_ORDER.map((weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    if (!h || !h.is_open || !h.opens_at || !h.closes_at)
      return { weekday, label: WEEKDAY_NAMES[weekday], text: "Fechado" };
    const t = formatHourShort;
    const dayBreaks = breaks.filter((b) => b.weekday === weekday);
    const ranges: string[] = [];
    let cursor = h.opens_at;
    for (const b of dayBreaks) {
      ranges.push(`${t(cursor)} às ${t(b.starts_at)}`);
      cursor = b.ends_at;
    }
    ranges.push(`${t(cursor)} às ${t(h.closes_at)}`);
    return { weekday, label: WEEKDAY_NAMES[weekday], text: ranges.join(" e ") };
  });
}

export function Location({
  address,
  reference,
  hours,
  breaks,
  todayWeekday,
}: {
  address: string | null;
  reference: string | null;
  hours: Hours[];
  breaks: Break[];
  todayWeekday: number;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {address ? (
        <div className="rounded-[var(--radius-card)] bg-white/5 p-5">
          <p className="font-display text-lg font-bold">Endereço</p>
          <p className="mt-2">{address}</p>
          {reference ? <p className="text-night-sub mt-1">{reference}</p> : null}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener"
            className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            Ver no mapa
          </a>
        </div>
      ) : null}
      <div className="rounded-[var(--radius-card)] bg-white/5 p-5">
        <p className="font-display text-lg font-bold">Horários</p>
        <dl className="mt-2 space-y-1.5">
          {hoursLines(hours, breaks).map((l) => (
            <div key={l.weekday} className="flex justify-between gap-4 text-sm">
              <dt className={l.weekday === todayWeekday ? "font-bold" : "text-night-sub"}>
                {l.label}
                {l.weekday === todayWeekday ? " (hoje)" : ""}
              </dt>
              <dd className={l.weekday === todayWeekday ? "text-right font-bold" : "text-right"}>
                {l.text}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-white/10 rounded-[var(--radius-card)] border border-white/10">
      {items.map((f) => (
        <details key={f.q} className="group px-5">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold">
            {f.q}
            <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="text-night-sub pb-5">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaButton({ accent, className = "" }: { accent: string; className?: string }) {
  return (
    <Link
      href="/agendar"
      className={`inline-flex min-h-14 items-center justify-center rounded-[var(--radius-control)] px-6 text-[17px] font-bold shadow-lg ${className}`}
      style={{ background: accent, color: readableTextOn(accent) }}
    >
      Agendar meu horário
    </Link>
  );
}

export function StickyCta({ accent, name }: { accent: string; name: string }) {
  return (
    <div className="bg-night/90 fixed inset-x-0 bottom-0 z-40 border-t border-white/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <p className="hidden min-w-0 flex-1 truncate font-semibold sm:block">{name}</p>
        <CtaButton accent={accent} className="w-full sm:w-auto" />
      </div>
    </div>
  );
}
