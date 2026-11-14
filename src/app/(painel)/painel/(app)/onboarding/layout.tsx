import { Logo } from "@/components/logo";
import { OnboardingProgress } from "./progress";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper min-h-dvh">
      <header className="mx-auto w-full max-w-xl px-4 pt-6">
        <Logo />
        <OnboardingProgress />
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
