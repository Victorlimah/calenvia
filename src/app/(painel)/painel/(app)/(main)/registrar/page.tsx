import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { ButtonLink, EmptyState } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { loadServices, loadStaff } from "@/lib/business/load";
import { formatTime, isLocalDate, todayIn } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrar atendimento — Calenvia" };

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; cliente?: string }>;
}) {
  const { business } = await requirePermission("appointments.manage_all");
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [services, staff] = await Promise.all([
    loadServices(supabase, business.id),
    loadStaff(supabase, business.id),
  ]);
  const { data: preselected } =
    sp.cliente && /^[0-9a-f-]{36}$/i.test(sp.cliente)
      ? await supabase
          .from("customers")
          .select("id, name, whatsapp")
          .eq("id", sp.cliente)
          .eq("business_id", business.id)
          .maybeSingle()
      : { data: null };
  const activeServices = services.filter((s) => s.is_active);
  const activeStaff = staff.filter((s) => s.is_active);
  const today = todayIn(business.timezone);
  const date = sp.data && isLocalDate(sp.data) && sp.data <= today ? sp.data : today;
  return (
    <PageBody>
      <PageHeader
        title="Registrar atendimento"
        back={{ href: `/agenda?data=${date}`, label: "Agenda" }}
      />
      <p className="text-ink-2">
        Para o cliente que chegou sem marcar ou um atendimento que você não anotou na hora. Ele
        entra como concluído e conta no financeiro.
      </p>
      {activeServices.length === 0 || activeStaff.length === 0 ? (
        <EmptyState
          title="Cadastre serviços e profissionais"
          description="Para registrar, você precisa de pelo menos um serviço ativo e um profissional."
          action={<ButtonLink href="/ajustes">Ir para os ajustes</ButtonLink>}
        />
      ) : (
        <RegisterForm
          today={today}
          nowTime={formatTime(new Date(), business.timezone)}
          services={activeServices.map((s) => ({
            id: s.id,
            name: s.name,
            price_cents: s.price_cents,
          }))}
          staff={activeStaff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.service_ids }))}
          initialDate={date}
          initialCustomer={preselected}
        />
      )}
    </PageBody>
  );
}
