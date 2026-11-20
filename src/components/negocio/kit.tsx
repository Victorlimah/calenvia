/**
 * Peças comuns dos templates (CAL-145): botão único de agendar, ícones simples em SVG próprio,
 * avatar nas cores do tema e utilidades. Só tokens de tema.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/themes/logo";

export const CTA_TEXT = "Agendar meu horário";

export function CtaLink({
  className,
  href = "/agendar",
  children = CTA_TEXT,
}: {
  className?: string;
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-[var(--radius-control)] px-7 text-[17px] font-bold transition-colors",
        className,
      )}
      style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
    >
      {children}
    </Link>
  );
}

/** Avatar do profissional: foto ou iniciais nas cores do tema (contraste garantido). */
export function ThemedAvatar({
  name,
  url,
  size = 80,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        className={cn("shrink-0 object-cover", className ?? "rounded-full")}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-t-display font-bold",
        className ?? "rounded-full",
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: "var(--c-primary)",
        color: "var(--c-primary-fg)",
      }}
    >
      {initials(name)}
    </span>
  );
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <p className={className} style={{ color: "var(--c-link)" }}>
      <span aria-hidden="true">{"★".repeat(rating)}</span>
      <span className="sr-only">{rating} de 5 estrelas</span>
    </p>
  );
}

type IconProps = { className?: string };
const base = "shrink-0";
const svg = (path: React.ReactNode) =>
  function Icon({ className }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn(base, className ?? "size-5")}
      >
        {path}
      </svg>
    );
  };

export const IconClock = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const IconCheck = svg(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconCalendar = svg(
  <>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);
export const IconChat = svg(<path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" />);
export const IconShield = svg(
  <>
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </>,
);
export const IconHeart = svg(
  <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
);
export const IconSparkle = svg(
  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />,
);
export const IconLeaf = svg(
  <>
    <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
    <path d="M5 19l7-7" />
  </>,
);
export const IconStar = svg(
  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />,
);
export const IconPin = svg(
  <>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);
