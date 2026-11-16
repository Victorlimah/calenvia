import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader, TabBody } from "@/components/painel/page-header";
import { Card, EmptyState } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { periodOf } from "@/lib/dates";
import { hasFeature } from "@/lib/plans";
import { shiftMonth } from "@/lib/reports/monthly";
import { MONTHS_PT } from "@/lib/agenda/view";

export const metadata: Metadata = { title: "Exportar — Calenvia" };

/** Exportar o mês em CSV (CAL-127), para o contador ou para a planilha. Pro+. */
export default async function ExportarPage() {
  const { business } = await requirePermission("finance.view");
  if (!hasFeature(business, "reports")) {
    return (
      <TabBody>
        <EmptyState
          title="Exportar faz parte do plano Pro+"
          description="Baixe os atendimentos e lançamentos do mês numa planilha para o contador."
          action={
            <Link href="/assinatura" className="font-semibold text-brand underline">
              Ver o plano Pro+
            </Link>
          }
        />
      </TabBody>
    );
  }
  const current = periodOf(new Date(), business.timezone);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(current, -i));
  return (
    <TabBody>
      <SectionHeader
        title="Exportar"
        description="Planilha (CSV) com os atendimentos concluídos, as receitas e as despesas do mês. Abre no Excel e no Google Planilhas."
      />
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {months.map((m) => {
            const [y, mm] = m.split("-").map(Number);
            const label = `${MONTHS_PT[mm - 1]} de ${y}`;
            return (
              <li key={m} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="font-semibold first-letter:uppercase">{label}</span>
                <a
                  href={`/financeiro/exportar/csv?mes=${m}`}
                  download
                  className="inline-flex min-h-11 items-center font-semibold text-brand"
                  aria-label={`Baixar CSV de ${label}`}
                >
                  Baixar CSV
                </a>
              </li>
            );
          })}
        </ul>
      </Card>
    </TabBody>
  );
}
