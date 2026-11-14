import type { Metadata } from "next";
import { AgendaRulesForm } from "@/components/painel/agenda-rules-form";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";

export const metadata: Metadata = { title: "Regras da agenda — Calenvia" };

export default async function AjustesRegrasPage() {
  const { business: b } = await requirePermission("settings.manage");
  return (
    <PageBody>
      <PageHeader title="Regras da agenda" back={{ href: "/ajustes", label: "Ajustes" }} />
      <AgendaRulesForm
        defaults={{
          slot_interval_min: b.slot_interval_min,
          min_notice_min: b.min_notice_min,
          max_days_ahead: b.max_days_ahead,
          cancel_notice_min: b.cancel_notice_min,
        }}
      />
    </PageBody>
  );
}
