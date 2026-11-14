import { PainelShell } from "@/components/painel/shell";
import { getMyMemberships, requireReadyBusiness } from "@/lib/business/current";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
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
