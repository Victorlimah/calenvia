import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SignOutButton } from "@/components/painel/shell";
import { getMyMemberships, requireReadyMember } from "@/lib/business/current";
import { BusinessSwitcher } from "@/components/painel/business-switcher";
import { ROLE_LABELS } from "@/lib/permissions";
import { businessDisplayHost } from "@/lib/hosts";
import { settingsMenuFor } from "@/lib/settings-menu";

export const metadata: Metadata = { title: "Ajustes — Calenvia" };

export default async function AjustesPage() {
  const member = await requireReadyMember();
  const { business } = member;
  const memberships = await getMyMemberships();
  const groups = settingsMenuFor(member);
  return (
    <PageBody>
      <PageHeader
        title="Ajustes"
        description="Sua conta, mensagens, plano e ajuda. O que é do negócio fica em Meu negócio."
      />
      <p className="text-sm text-muted">
        {business.name} · {businessDisplayHost(business.slug)} · {ROLE_LABELS[member.role]}
      </p>
      <BusinessSwitcher
        current={business.id}
        options={memberships.map((m) => ({
          id: m.business.id,
          name: m.business.name,
          role: ROLE_LABELS[m.role],
        }))}
      />
      {groups.map((group) => (
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
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-2">
        <SignOutButton />
      </div>
    </PageBody>
  );
}
