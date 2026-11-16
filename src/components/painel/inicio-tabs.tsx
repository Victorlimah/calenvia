import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * No celular, o Financeiro é uma aba do Início (CAL-117). No computador o Financeiro tem item
 * próprio no menu lateral, então as abas somem.
 */
export function InicioTabs({ current }: { current: "resumo" | "financeiro" }) {
  const tabs = [
    { key: "resumo", href: "/", label: "Resumo" },
    { key: "financeiro", href: "/financeiro", label: "Financeiro" },
  ] as const;
  return (
    <nav aria-label="Abas do Início" className="md:hidden">
      <ul className="grid grid-cols-2 rounded-[var(--radius-control)] border border-line bg-white p-1">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={current === t.key ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold",
                current === t.key ? "bg-ink text-white" : "text-ink-2",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
