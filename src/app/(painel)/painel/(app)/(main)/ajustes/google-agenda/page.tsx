import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";
import { loadStaff } from "@/lib/business/load";
import { siteUrl } from "@/lib/hosts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CalendarFeed } from "./calendar-feed";

export const metadata: Metadata = { title: "Google Agenda — Calenvia" };

export default async function GoogleAgendaPage() {
  const { business } = await requirePermission("settings.manage");
  const staff = (await loadStaff(await createSupabaseServerClient(), business.id)).filter(
    (s) => s.is_active,
  );
  const url = business.calendar_token
    ? siteUrl(`/api/calendario/${business.calendar_token}`)
    : null;
  return (
    <PageBody>
      <PageHeader
        title="Google Agenda e celular"
        description="Veja os agendamentos da Calenvia no Google Agenda, no calendário do iPhone ou no Outlook."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <CalendarFeed url={url} staff={staff.map((s) => ({ id: s.id, name: s.name }))} />
    </PageBody>
  );
}
