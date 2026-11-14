import { requireHost } from "@/lib/host-guard";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireHost("app");
  return children;
}
