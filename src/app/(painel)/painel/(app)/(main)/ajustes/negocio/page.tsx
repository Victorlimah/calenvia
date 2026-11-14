import type { Metadata } from "next";
import { BusinessInfoForm } from "@/components/painel/business-info-form";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requireReadyBusiness } from "@/lib/business/current";

export const metadata: Metadata = { title: "Dados do negócio — Calenvia" };

export default async function AjustesNegocioPage() {
  const business = await requireReadyBusiness();
  return (
    <PageBody>
      <PageHeader title="Dados do negócio" back={{ href: "/ajustes", label: "Ajustes" }} />
      <BusinessInfoForm
        submitLabel="Salvar"
        defaults={{
          name: business.name,
          segment: (business.segment ?? undefined) as never,
          address: business.address ?? "",
          address_reference: business.address_reference ?? "",
          whatsapp: business.whatsapp,
          instagram: business.instagram ?? "",
          slug: business.slug,
          timezone: business.timezone,
        }}
      />
    </PageBody>
  );
}
