import { PainelShell } from "@/components/painel/shell";
import { requireReadyBusiness } from "@/lib/business/current";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const business = await requireReadyBusiness();
  return <PainelShell businessName={business.name}>{children}</PainelShell>;
}
