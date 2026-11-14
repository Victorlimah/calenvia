import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SignOutButton } from "@/components/painel/shell";
import { NotificationSettings } from "@/components/painel/notification-settings";
import { requireReadyBusiness } from "@/lib/business/current";
import { businessDisplayHost } from "@/lib/hosts";
import { SETTINGS_MENU as GROUPS } from "@/lib/settings-menu";

export const metadata: Metadata = { title: "Ajustes — Calenvia" };

export default async function AjustesPage() {
  const business = await requireReadyBusiness();
  return (
    <PageBody>
      <PageHeader title="Ajustes" description={businessDisplayHost(business.slug)} />
      {GROUPS.map((group) => (
        <section key={group.title} aria-labelledby={`grupo-${group.title}`} className="space-y-2">
          <h2 id={`grupo-${group.title}`} className="px-1 text-sm font-semibold text-ink-2">
            {group.title}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-paper-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{item.title}</span>
                    <span className="block truncate text-sm text-muted">{item.desc}</span>
                  </span>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <NotificationSettings />
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-2 md:hidden">
        <SignOutButton />
      </div>
    </PageBody>
  );
}
