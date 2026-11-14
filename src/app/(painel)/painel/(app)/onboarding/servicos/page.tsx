import type { Metadata } from "next";
import { ServicesEditor } from "@/components/painel/services-editor";
import { requireBusiness } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepNav } from "../step-nav";

export const metadata: Metadata = { title: "Serviços — Calenvia" };

export default async function OnboardingServicosPage() {
  const business = await requireBusiness();
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-ink text-3xl font-extrabold">O que você oferece?</h1>
        <p className="text-ink-2 mt-1">
          Cadastre seus serviços com duração e preço. Dá para mudar tudo depois.
        </p>
      </div>
      <ServicesEditor services={services} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
      <StepNav
        back="/onboarding"
        next="/onboarding/profissionais"
        disabled={services.length === 0}
      />
    </div>
  );
}
