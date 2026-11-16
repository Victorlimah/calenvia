import type { Metadata } from "next";
import { NotificationSettings } from "@/components/painel/notification-settings";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requireReadyMember } from "@/lib/business/current";

export const metadata: Metadata = { title: "Notificações — Calenvia" };

export default async function NotificacoesPage() {
  await requireReadyMember();
  return (
    <PageBody>
      <PageHeader
        title="Notificações"
        description="Receba um aviso neste aparelho quando um cliente agendar pela sua página."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <NotificationSettings />
    </PageBody>
  );
}
