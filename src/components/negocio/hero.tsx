import { readableTextOn } from "@/lib/color";
import { cn } from "@/lib/cn";

export type HeroProps = {
  name: string;
  segmentLabel: string;
  headline: string | null;
  subheadline: string | null;
  accent: string;
  logoUrl: string | null;
  coverUrl: string | null;
  ctaHref?: string;
  /** Prévia no painel: tamanho reduzido e sem link. */
  preview?: boolean;
};

export function defaultHeadline(name: string) {
  return `Agende seu horário na ${name}`;
}

export const DEFAULT_SUBHEADLINE =
  "Escolha o serviço, o profissional e o horário. A confirmação chega no seu WhatsApp.";

/** Abertura da página pública: foto, nome, título grande e o CTA único. */
export function Hero({
  name,
  segmentLabel,
  headline,
  subheadline,
  accent,
  logoUrl,
  coverUrl,
  ctaHref = "/agendar",
  preview = false,
}: HeroProps) {
  const ctaText = readableTextOn(accent);
  const Cta = preview ? "span" : "a";
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-night text-night-fg",
        preview ? "rounded-[var(--radius-card)]" : "",
      )}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover opacity-45"
          fetchPriority={preview ? undefined : "high"}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background: `radial-gradient(120% 80% at 80% 0%, ${accent} 0%, transparent 60%)`,
          }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/70 to-night/20"
      />
      <div
        className={cn("mx-auto max-w-2xl px-5", preview ? "py-8" : "pt-10 pb-14 md:pt-16 md:pb-20")}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo da ${name}`}
              className="size-12 rounded-2xl bg-white object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex size-12 items-center justify-center rounded-2xl font-display text-xl font-extrabold"
              style={{ background: accent, color: ctaText }}
            >
              {name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="font-display text-lg leading-tight font-bold">{name}</p>
            <p className="text-sm text-night-sub">{segmentLabel}</p>
          </div>
        </div>
        <h1
          className={cn(
            "mt-8 font-display leading-[1.05] font-extrabold tracking-tight",
            preview ? "text-3xl" : "text-[2.6rem] md:text-6xl",
          )}
        >
          {headline || defaultHeadline(name)}
        </h1>
        <p className={cn("mt-4 text-night-sub", preview ? "text-sm" : "text-lg")}>
          {subheadline || DEFAULT_SUBHEADLINE}
        </p>
        <Cta
          {...(preview ? {} : { href: ctaHref })}
          className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] px-6 text-[17px] font-bold shadow-lg sm:w-auto"
          style={{ background: accent, color: ctaText }}
        >
          Agendar meu horário
        </Cta>
      </div>
    </section>
  );
}
