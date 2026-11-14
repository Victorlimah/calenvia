import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { EmptyState, ButtonLink } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { isLocalDate, todayIn } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewAppointmentForm } from "./new-appointment-form";

export const metadata: Metadata = { title: "Novo agendamento — Calenvia" };

type Props = { searchParams: Promise<{ data?: string; hora?: string; profissional?: string }> };

export default async function NovoPage({ searchParams }: Props) {
  const business = await requireReadyBusiness();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  const activeServices = services.filter((s) => s.is_active);
  const activeStaff = staff.filter((s) => s.is_active);
  const date = sp.data && isLocalDate(sp.data) ? sp.data : todayIn(business.timezone);
  return (
    <PageBody>
      <PageHeader title="Novo agendamento" back={{ href: `/?data=${date}`, label: "Agenda" }} />
      {activeServices.length === 0 || activeStaff.length === 0 ? (
        <EmptyState
          title="Cadastre serviços e profissionais"
          description="Para agendar, você precisa de pelo menos um serviço ativo e um profissional."
          action={<ButtonLink href="/ajustes">Ir para os ajustes</ButtonLink>}
        />
      ) : (
        <NewAppointmentForm
          timezone={business.timezone}
          services={activeServices.map((s) => ({
            id: s.id,
            name: s.name,
            duration_min: s.duration_min,
            price_cents: s.price_cents,
          }))}
          staff={activeStaff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.service_ids }))}
          initial={{ date, time: sp.hora ?? null, staffId: sp.profissional ?? null }}
        />
      )}
    </PageBody>
  );
}
