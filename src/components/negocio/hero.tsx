import { cn } from "@/lib/cn";
import type { LogoShape } from "@/lib/themes/schema";
import { BusinessMark } from "./business-mark";

export type HeroProps = {
  name: string;
  segmentLabel: string;
  headline: string | null;
  subheadline: string | null;
  logoUrl: string | null;
  /** Formato do logo/monograma (tema, CAL-143). */
  logoShape?: LogoShape;
  /** false = o logo fica só no cabeçalho/rodapé; a abertura mostra o monograma. */
  showLogo?: boolean;
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

/** Abertura da página pública: foto, nome, título grande e o CTA único. Cores pelos tokens do tema. */
export function Hero({
  name,
  segmentLabel,
  headline,
  subheadline,
  logoUrl,
  logoShape = "square",
  showLogo = true,
  coverUrl,
  ctaHref = "/agendar",
  preview = false,
}: HeroProps) {
  const Cta = preview ? "span" : "a";
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-t-bg text-t-text",
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
            background: "radial-gradient(120% 80% at 80% 0%, var(--c-primary) 0%, transparent 60%)",
          }}
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-t-bg via-t-bg/70 to-t-bg/20"
      />
      <div
        className={cn("mx-auto max-w-2xl px-5", preview ? "py-8" : "pt-10 pb-14 md:pt-16 md:pb-20")}
      >
        <div className="flex items-center gap-3">
          <BusinessMark name={name} logoUrl={showLogo ? logoUrl : null} shape={logoShape} />
          <div>
            <p className="font-t-display text-lg leading-tight font-bold">{name}</p>
            <p className="text-sm text-t-sub">{segmentLabel}</p>
          </div>
        </div>
        <h1
          className={cn(
            "mt-8 font-t-display leading-[1.05] font-extrabold tracking-tight",
            preview ? "text-3xl" : "text-[2.6rem] md:text-6xl",
          )}
        >
          {headline || defaultHeadline(name)}
        </h1>
        <p className={cn("mt-4 text-t-sub", preview ? "text-sm" : "text-lg")}>
          {subheadline || DEFAULT_SUBHEADLINE}
        </p>
        <Cta
          {...(preview ? {} : { href: ctaHref })}
          className="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] px-6 text-[17px] font-bold shadow-lg sm:w-auto"
          style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
        >
          Agendar meu horário
        </Cta>
      </div>
    </section>
  );
}
