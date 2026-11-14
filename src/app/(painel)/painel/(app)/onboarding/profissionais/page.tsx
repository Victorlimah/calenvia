import type { Metadata } from "next";
import { StaffEditor } from "@/components/painel/staff-editor";
import { requireUser } from "@/lib/auth/session";
import { requireBusiness } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepNav } from "../step-nav";

export const metadata: Metadata = { title: "Equipe — Calenvia" };

export default async function OnboardingProfissionaisPage() {
  const user = await requireUser();
  const business = await requireBusiness();
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Quem atende?</h1>
        <p className="mt-1 text-ink-2">
          Seus clientes escolhem o profissional ou deixam “sem preferência”.
        </p>
      </div>
      <StaffEditor
        staff={staff}
        services={services.map((s) => ({ id: s.id, name: s.name }))}
        ownerName={(user.user_metadata?.name as string | undefined) ?? ""}
      />
      <StepNav
        back="/onboarding/servicos"
        next="/onboarding/horarios"
        disabled={staff.length === 0}
      />
    </div>
  );
}
