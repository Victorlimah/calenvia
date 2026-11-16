import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PackagesEditor } from "./packages-editor";

export const metadata: Metadata = { title: "Pacotes — Calenvia" };

export default async function PacotesPage() {
  const { business } = await requirePermission("finance.view");
  const supabase = await createSupabaseServerClient();
  const [{ data: services }, { data: packages }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, price_cents")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("service_packages")
      .select("id, service_id, name, sessions, price_cents, validity_days, is_active")
      .eq("business_id", business.id)
      .order("created_at"),
  ]);
  return (
    <PageBody>
      <PageHeader
        title="Pacotes"
        description="Venda várias sessões de um serviço de uma vez (ex.: 4 cortes com desconto)."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <PackagesEditor services={services ?? []} packages={packages ?? []} />
    </PageBody>
  );
}
