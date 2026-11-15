import { redirect } from "next/navigation";
import { PainelShell } from "@/components/painel/shell";
import { getPlatformAdmin } from "@/lib/admin/auth";
import { getCurrentMember, getMyMemberships, requireReadyBusiness } from "@/lib/business/current";
import { BillingBanner } from "@/components/painel/billing-banner";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { needsCheckout } from "@/lib/plans";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // Equipe da Calenvia sem negócio próprio vai direto para a administração (CAL-114).
  if (!(await getCurrentMember()) && (await getPlatformAdmin())) redirect("/admin");
  const business = await requireReadyBusiness();
  // Cadastro sem pagamento ou assinatura cancelada: primeiro ativa (CAL-076).
  if (needsCheckout(business)) redirect("/assinatura/checkout");
  const memberships = await getMyMemberships();
  const member = await getCurrentMember();
  let pastDueSince: string | null = null;
  if (business.plan_status === "past_due") {
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
      businessName={business.name}
      businessId={business.id}
      timezone={business.timezone}
      businesses={memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: ROLE_LABELS[m.role],
      }))}
    >
      {business.plan_status === "past_due" || business.plan_status === "suspended" ? (
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
