"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/app/(painel)/painel/(auth)/actions";
import { NewBookingNotifier } from "./new-booking-notifier";
import { RegisterServiceWorker } from "./register-sw";

const NAV = [
  {
    href: "/",
    label: "Agenda",
    icon: CalendarIcon,
    match: (p: string) =>
      p === "/" ||
      p.startsWith("/agendamento") ||
      p.startsWith("/novo") ||
      p.startsWith("/bloquear"),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: UsersIcon,
    match: (p: string) => p.startsWith("/clientes"),
  },
  {
    href: "/ajustes",
    label: "Ajustes",
    icon: GearIcon,
    match: (p: string) =>
      p.startsWith("/ajustes") || p.startsWith("/assinatura") || p.startsWith("/relatorios"),
  },
];

export function PainelShell({
  businessName,
  businessId,
  timezone,
  children,
}: {
  businessName: string;
  businessId: string;
  timezone: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname().replace(/^\/painel(?=\/|$)/, "") || "/";
  return (
    <div className="min-h-dvh bg-paper md:flex">
      <NewBookingNotifier businessId={businessId} timezone={timezone} />
      <RegisterServiceWorker />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:sticky md:top-0 md:flex md:h-dvh">
        <Logo />
        <p className="mt-6 truncate px-3 text-sm font-semibold text-ink-2">{businessName}</p>
        <nav aria-label="Menu principal" className="mt-3 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold",
                  active ? "bg-brand-50 text-brand" : "text-ink-2 hover:bg-paper-2",
                )}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-0">{children}</div>

      <nav
        aria-label="Menu principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                active ? "text-brand" : "text-muted",
              )}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={cn(
        "flex min-h-11 w-full items-center rounded-xl px-3 text-left font-semibold text-ink-2 hover:bg-paper-2",
        className,
      )}
      onClick={() =>
        start(async () => {
          await signOutAction();
          router.push("/entrar");
          router.refresh();
        })
      }
    >
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" strokeLinecap="round" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
