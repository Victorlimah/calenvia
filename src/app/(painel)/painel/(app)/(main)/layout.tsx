import { requireReadyBusiness } from "@/lib/business/current";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  await requireReadyBusiness();
  return children;
}
