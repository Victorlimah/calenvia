import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { requirePlatformAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Administração — Calenvia",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Negócios" },
  { href: "/admin/metricas", label: "Métricas" },
  { href: "/admin/suporte", label: "Suporte" },
  { href: "/admin/mensagens", label: "Mensagens" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const { count: openSupport } = await createSupabaseAdminClient()
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">
              Admin
            </span>
          </div>
          <nav aria-label="Administração" className="flex flex-wrap items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-paper-2"
              >
                {n.label}
                {n.href === "/admin/suporte" && openSupport ? (
                  <span className="ml-1.5 rounded-full bg-danger px-1.5 text-xs font-bold text-white">
                    <span className="sr-only">(</span>
                    {openSupport}
                    <span className="sr-only">
                      {openSupport === 1 ? " pedido aberto)" : " pedidos abertos)"}
                    </span>
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <p className="w-full truncate text-xs text-muted sm:w-auto">{admin.email}</p>
        </div>
      </header>
      {children}
    </div>
  );
}
