import { InicioTabs } from "@/components/painel/inicio-tabs";
import { TabsNav } from "@/components/painel/tabs-nav";
import { requirePermission } from "@/lib/business/current";
import { FINANCE_TABS } from "@/lib/painel-nav";

/** Financeiro unificado (CAL-127): Resumo · Entradas e despesas · Relatórios · Exportar. */
export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("finance.view");
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-ink">Financeiro</h1>
        <p className="mt-1 text-ink-2">Quanto entrou, quanto saiu e de onde veio.</p>
      </header>
      <InicioTabs current="financeiro" />
      <TabsNav tabs={FINANCE_TABS} label="Seções do Financeiro" />
      {children}
    </main>
  );
}
