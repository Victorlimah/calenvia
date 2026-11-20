import { cn } from "@/lib/cn";
import { initials } from "@/lib/themes/logo";
import type { LogoShape } from "@/lib/themes/schema";

const SIZES = { sm: "size-9 text-sm", md: "size-12 text-xl", lg: "size-16 text-2xl" } as const;
const FREE_H = { sm: "h-9 max-w-28", md: "h-12 max-w-40", lg: "h-16 max-w-52" } as const;

/**
 * Marca do negócio (CAL-143): o logo, no formato do tema, ou um monograma com as iniciais nas
 * cores do tema. Sem logo a página continua completa.
 */
export function BusinessMark({
  name,
  logoUrl,
  shape = "round",
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  shape?: LogoShape;
  size?: keyof typeof SIZES;
}) {
  const rounded =
    shape === "round"
      ? "rounded-full"
      : shape === "square"
        ? "rounded-[min(var(--radius-card),1rem)]"
        : "";
  if (logoUrl) {
    return shape === "free" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Logo da ${name}`}
        className={cn("w-auto object-contain", FREE_H[size])}
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`Logo da ${name}`}
        className={cn("shrink-0 bg-white object-cover", SIZES[size], rounded)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-t-display font-extrabold tracking-tight",
        SIZES[size],
        rounded || "rounded-[min(var(--radius-card),1rem)]",
      )}
      style={{ background: "var(--c-primary)", color: "var(--c-primary-fg)" }}
    >
      {initials(name)}
    </span>
  );
}
