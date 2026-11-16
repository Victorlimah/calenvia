import { TabsNav } from "@/components/painel/tabs-nav";
import { requireReadyMember } from "@/lib/business/current";
import { NEGOCIO_TABS, tabsFor } from "@/lib/painel-nav";

/** "Meu negócio" (CAL-118): tudo que é do negócio, em abas. */
export default async function NegocioLayout({ children }: { children: React.ReactNode }) {
  const member = await requireReadyMember();
  const tabs = tabsFor(NEGOCIO_TABS, member);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">Meu negócio</h1>
        <p className="mt-1 text-ink-2">{member.business.name}</p>
      </header>
      <TabsNav tabs={tabs} label="Seções de Meu negócio" />
      {children}
    </main>
  );
}
