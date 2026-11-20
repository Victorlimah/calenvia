import { redirect } from "next/navigation";
import { PainelShell } from "@/components/painel/shell";
import { getPlatformAdmin } from "@/lib/admin/auth";
import { getCurrentMember, getMyMemberships, requireReadyBusiness } from "@/lib/business/current";
import { BillingBanner } from "@/components/painel/billing-banner";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { needsCheckout } from "@/lib/plans";
import { isBillingEnabled } from "@/lib/config/access";
import { Alert } from "@/components/ui";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // Equipe da Calenvia sem negócio próprio vai direto para a administração (CAL-114).
  if (!(await getCurrentMember()) && (await getPlatformAdmin())) redirect("/admin");
  const business = await requireReadyBusiness();
  // Cadastro sem pagamento ou assinatura cancelada: primeiro ativa (CAL-076).
  // Com a cobrança desligada (CAL-135) não existe checkout: a conta espera a liberação do admin.
  const billing = isBillingEnabled();
  if (billing && needsCheckout(business)) redirect("/assinatura/checkout");
  const awaitingRelease = !billing && needsCheckout(business);
  const memberships = await getMyMemberships();
  const member = await getCurrentMember();
  let pastDueSince: string | null = null;
  if (billing && business.plan_status === "past_due") {
    const { data } = await createSupabaseAdminClient()
      .from("subscriptions")
      .select("past_due_since")
      .eq("business_id", business.id)
      .neq("status", "canceled")
      .maybeSingle();
    pastDueSince = data?.past_due_since ?? null;
  }
  return (
    <PainelShell
      role={member?.role ?? "staff"}
      businessName={business.name}
      businessId={business.id}
      timezone={business.timezone}
      businesses={memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: ROLE_LABELS[m.role],
      }))}
    >
      {awaitingRelease ? (
        <div className="mx-auto w-full max-w-2xl px-4 pt-4" data-testid="awaiting-release">
          <Alert tone="info" title="Sua conta está aguardando liberação">
            A equipe da Calenvia vai liberar sua página em breve. Enquanto isso, você já pode
            configurar tudo no painel.
          </Alert>
        </div>
      ) : null}
      {billing && (business.plan_status === "past_due" || business.plan_status === "suspended") ? (
        <div className="mx-auto w-full max-w-2xl px-4 pt-4">
          <BillingBanner
            status={business.plan_status}
            pastDueSince={pastDueSince}
            timezone={business.timezone}
            canManage={can(member, "billing.manage")}
          />
        </div>
      ) : null}
      {children}
    </PainelShell>
  );
}
