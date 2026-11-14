import { requireUser } from "@/lib/auth/session";

export default async function PainelAppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}
