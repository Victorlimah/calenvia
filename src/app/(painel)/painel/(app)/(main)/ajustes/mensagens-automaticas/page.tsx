import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";
import { businessUrl } from "@/lib/hosts";
import { cancellationText, confirmationText, reminderText } from "@/lib/messages/templates";
import { canSendAutomaticMessages, monthlyMessageLimit, PLANS } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthQuota } from "@/lib/whatsapp/quota";
import { loadMessageSettings } from "@/lib/whatsapp/send";
import { AutomaticMessagesForm } from "./automatic-messages-form";

export const metadata: Metadata = { title: "Mensagens automáticas — Calenvia" };

export default async function MensagensAutomaticasPage() {
  const { business } = await requirePermission("settings.manage");
  const supabase = await createSupabaseServerClient();
  const allowed = canSendAutomaticMessages(business);
  const [settings, quota] = await Promise.all([
    loadMessageSettings(supabase, business.id),
    allowed ? getMonthQuota(supabase, business) : Promise.resolve(null),
  ]);
  const sample = {
    customerName: "Lucas Andrade",
    businessName: business.name,
    serviceName: "Corte",
    staffName: "Carla",
    start: new Date(Date.now() + 2 * 86400000),
    timezone: business.timezone,
    link: businessUrl(business.slug, "/gerenciar/ABC234"),
  };

  return (
    <PageBody>
      <PageHeader
        title="Mensagens automáticas"
        description="Escolha o que a Calenvia envia sozinha no WhatsApp dos seus clientes."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <AutomaticMessagesForm
        allowed={allowed}
        initial={settings}
        limit={allowed ? monthlyMessageLimit(business) : (PLANS.pro.monthlyMessages ?? 300)}
        used={quota?.state.used ?? 0}
        previews={{
          confirmation: confirmationText(sample),
          reminder: reminderText(sample),
          cancellation: cancellationText(sample),
        }}
      />
    </PageBody>
  );
}
