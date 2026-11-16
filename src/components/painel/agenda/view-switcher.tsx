"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { AGENDA_VIEW_COOKIE, type AgendaView } from "@/lib/agenda/view";

function remember(view: AgendaView) {
  try {
    document.cookie = `${AGENDA_VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // sem cookie: só não lembra a escolha
  }
}

/** Lista · Dia · Semana · Mês. Lembra a última escolha neste aparelho (CAL-121). */
export function ViewSwitcher({
  views,
  current,
}: {
  views: { key: AgendaView; label: string; href: string }[];
  current: AgendaView;
}) {
  return (
    <div
      className="inline-flex rounded-[var(--radius-control)] border border-line bg-white p-1"
      role="group"
      aria-label="Visão"
    >
      {views.map((v) => (
        <Link
          key={v.key}
          href={v.href}
          onClick={() => remember(v.key)}
          aria-current={v.key === current ? "true" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-xl px-3 text-sm font-semibold",
            v.key === current ? "bg-ink text-white" : "text-ink-2 hover:text-ink",
          )}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Sem visão escolhida e sem preferência salva: no computador abre na Semana; no celular fica na
 * Lista (o servidor não sabe o tamanho da tela, então decide aqui, uma vez).
 */
export function DesktopDefaultView({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) router.replace(href);
  }, [href, router]);
  return null;
}
