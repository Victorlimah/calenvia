import type { Metadata } from "next";
import { TabBody, SectionHeader } from "@/components/painel/page-header";
import { ServicesEditor } from "@/components/painel/services-editor";
import { requirePermission } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Serviços — Calenvia" };

export default async function AjustesServicosPage() {
  const { business } = await requirePermission("settings.manage");
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  return (
    <TabBody>
      <SectionHeader
        title="Serviços e valores"
        description="Preço, duração e quem faz cada serviço. A ordem aqui é a ordem na sua página."
      />
      <ServicesEditor
        layout="panel"
        services={services}
        staff={staff.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name }))}
      />
    </TabBody>
  );
}
