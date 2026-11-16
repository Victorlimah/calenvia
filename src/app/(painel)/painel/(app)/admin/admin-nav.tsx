"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { activeAdminHref, ADMIN_NAV, COUNTER_LABELS, type AdminCounter } from "@/lib/admin/nav";

/** Links do menu do admin, em grupos, com contador de pendências (CAL-129). */
export function AdminNavLinks({ counts }: { counts: Record<AdminCounter, number> }) {
  const active = activeAdminHref(usePathname());
  return (
    <div className="space-y-5">
      {ADMIN_NAV.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">{g.title}</p>
          <ul className="mt-1 space-y-0.5">
            {g.items.map((i) => {
              const n = i.counter ? counts[i.counter] : 0;
              const isActive = active === i.href;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) =>
                      // fecha o menu recolhível do celular ao navegar
                      e.currentTarget.closest("details")?.removeAttribute("open")
                    }
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 font-semibold",
                      isActive ? "bg-brand-50 text-brand" : "text-ink-2 hover:bg-paper-2",
                    )}
                  >
                    {i.label}
                    {n > 0 && i.counter ? (
                      <span className="rounded-full bg-danger px-2 text-xs font-bold text-white">
                        {n}
                        <span className="sr-only">
                          {" "}
                          {COUNTER_LABELS[i.counter][n === 1 ? 0 : 1]}
                        </span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
