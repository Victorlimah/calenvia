import { cn } from "@/lib/cn";

/** Marca Calenvia: calendário com check + nome. */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect x="3" y="5" width="26" height="24" rx="7" fill="#4B3FD9" />
        <rect x="9" y="2" width="3" height="7" rx="1.5" fill={dark ? "#fff" : "#14161A"} />
        <rect x="20" y="2" width="3" height="7" rx="1.5" fill={dark ? "#fff" : "#14161A"} />
        <path
          d="M10.5 18.5l3.6 3.6 7.4-7.6"
          stroke="#fff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn(
          "font-display text-xl font-extrabold tracking-tight",
          dark ? "text-white" : "text-ink",
        )}
      >
        Calenvia
      </span>
    </span>
  );
}
