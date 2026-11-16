"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeTab, type Tab } from "@/lib/painel-nav";

/** Abas de uma área do painel (Meu negócio, Ajustes, Financeiro). Rola na horizontal no celular. */
export function TabsNav({ tabs, label }: { tabs: Tab[]; label: string }) {
  const current = activeTab(tabs, usePathname());
  if (tabs.length < 2) return null;
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = current?.href === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap",
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
