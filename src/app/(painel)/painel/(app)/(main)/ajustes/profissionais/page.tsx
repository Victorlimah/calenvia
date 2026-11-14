import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { StaffEditor } from "@/components/painel/staff-editor";
import { requirePermission } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profissionais — Calenvia" };

export default async function AjustesProfissionaisPage() {
  const { business } = await requirePermission("settings.manage");
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  return (
    <PageBody>
      <PageHeader
        title="Profissionais"
        description="Quem atende e quais serviços cada um faz."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <StaffEditor
        staff={staff}
        businessId={business.id}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageBody>
  );
}
