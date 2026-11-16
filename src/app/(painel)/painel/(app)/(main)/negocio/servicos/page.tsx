import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
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
    <PageBody>
      <PageHeader
        title="Serviços"
        description="A ordem aqui é a ordem na sua página."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <ServicesEditor
        services={services}
        staff={staff.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageBody>
  );
}
