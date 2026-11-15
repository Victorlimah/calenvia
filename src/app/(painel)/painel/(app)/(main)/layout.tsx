import { redirect } from "next/navigation";
import { PainelShell } from "@/components/painel/shell";
import { getPlatformAdmin } from "@/lib/admin/auth";
import { getCurrentMember, getMyMemberships, requireReadyBusiness } from "@/lib/business/current";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // Equipe da Calenvia sem negócio próprio vai direto para a administração (CAL-114).
  if (!(await getCurrentMember()) && (await getPlatformAdmin())) redirect("/admin");
  const business = await requireReadyBusiness();
  const memberships = await getMyMemberships();
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
      {children}
    </PainelShell>
  );
}
