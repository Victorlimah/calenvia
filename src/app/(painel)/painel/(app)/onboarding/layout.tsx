import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { OnboardingProgress } from "./progress";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Quem entrou por convite (CAL-112) não configura o negócio de outra pessoa.
  const member = await getCurrentMember();
  if (member && !can(member, "settings.manage")) redirect("/");
  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto w-full max-w-xl px-4 pt-6">
        <Logo />
        <OnboardingProgress />
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
