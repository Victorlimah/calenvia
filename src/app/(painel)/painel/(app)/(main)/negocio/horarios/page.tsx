import type { Metadata } from "next";
import { HoursEditor } from "@/components/painel/hours-editor";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";
import { loadWeekHours } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Horário de funcionamento — Calenvia" };

export default async function AjustesHorariosPage() {
  const { business } = await requirePermission("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { days } = await loadWeekHours(supabase, business.id);
  return (
    <PageBody>
      <PageHeader
        title="Horário de funcionamento"
        description="Os horários livres da sua página seguem estes dias e intervalos."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <HoursEditor initial={days} />
    </PageBody>
  );
}
