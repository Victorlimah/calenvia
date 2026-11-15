"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { VIEW_AS_PAGES } from "@/lib/admin/view-as";
import { cn } from "@/lib/cn";

/** Abas da visão só de leitura (só links; nenhuma ação). */
export function ViewAsTabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Telas do painel do cliente" className="border-b border-line bg-white">
      <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4">
        {VIEW_AS_PAGES.map((p) => {
          const href = `${base}${p.path}`;
          const active = pathname === href || pathname.endsWith(`/visao${p.path}`);
          return (
            <li key={p.slug} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap",
                  active ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink",
                )}
              >
                {p.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
