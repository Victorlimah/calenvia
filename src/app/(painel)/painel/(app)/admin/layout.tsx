import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/painel/shell";
import { requirePlatformAdmin } from "@/lib/admin/auth";
import type { AdminCounter } from "@/lib/admin/nav";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminNavLinks } from "./admin-nav";

export const metadata: Metadata = {
  title: "Administração — Calenvia",
  robots: { index: false, follow: false },
};

/** Administração da Calenvia (CAL-129): menu lateral em grupos, contadores e Sair. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  const { data } = await createSupabaseAdminClient().rpc("admin_pending_counts");
  const c = data?.[0];
  const counts: Record<AdminCounter, number> = {
    pending: Number(c?.pending_activation ?? 0),
    billing: Number(c?.past_due ?? 0) + Number(c?.suspended ?? 0),
    support: Number(c?.support_open ?? 0),
    failed: Number(c?.failed_messages_7d ?? 0),
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <div className="min-h-dvh bg-paper md:flex">
      {/* Computador: menu lateral fixo */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:sticky md:top-0 md:flex md:h-dvh md:overflow-y-auto">
        <div className="flex items-center gap-2 px-1">
          <Logo />
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">
            Admin
          </span>
        </div>
        <nav aria-label="Administração" className="mt-6">
          <AdminNavLinks counts={counts} />
        </nav>
        <div className="mt-auto space-y-1 pt-6">
          <p className="truncate px-3 text-xs text-muted">{admin.email}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Celular: barra no topo com menu recolhível */}
      <header className="sticky top-0 z-30 border-b border-line bg-white md:hidden">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Logo />
              <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">
                Admin
              </span>
            </span>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold">
              Menu
              {total > 0 ? (
                <span className="rounded-full bg-danger px-1.5 text-xs font-bold text-white">
                  {total}
                  <span className="sr-only"> pendências</span>
                </span>
              ) : null}
            </span>
          </summary>
          <nav
            aria-label="Administração (celular)"
            className="space-y-4 border-t border-line px-4 py-4"
          >
            <AdminNavLinks counts={counts} />
            <div className="border-t border-line pt-3">
              <p className="truncate px-3 text-xs text-muted">{admin.email}</p>
              <SignOutButton />
            </div>
          </nav>
        </details>
      </header>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
