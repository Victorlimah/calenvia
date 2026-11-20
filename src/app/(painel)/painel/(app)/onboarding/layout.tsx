import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/painel/shell";
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
      <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-16">
        {children}
        {member ? (
          <div className="mt-10 border-t border-line pt-4 text-sm text-ink-2">
            <p>
              Pode parar quando quiser: o que você salvou fica guardado e, ao entrar de novo, você
              continua de onde parou.
            </p>
            <SignOutButton label="Terminar depois" className="mt-2 w-auto px-0 text-brand" />
          </div>
        ) : null}
      </main>
    </div>
  );
}
