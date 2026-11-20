import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeStudio } from "@/components/painel/theme-studio";
import { buttonClasses } from "@/components/ui";
import { requireBusiness } from "@/lib/business/current";
import { loadStudioProps } from "@/lib/public/studio-data";

export const metadata: Metadata = { title: "Tema da página — Calenvia" };

/** Passo opcional do onboarding (CAL-148): escolher o visual com prévia da própria página. */
export default async function OnboardingTemaPage() {
  const business = await requireBusiness();
  if (!business.onboarding_completed_at) redirect("/onboarding/horarios");
  const props = await loadStudioProps(business);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          Escolha o visual da página
        </h1>
        <p className="mt-1 text-ink-2">
          Toque num tema para ver a sua página com ele. Dá para mudar quando quiser.
        </p>
      </div>
      <ThemeStudio {...props} afterSaveHref="/onboarding/pronto" />
      <Link
        href="/onboarding/pronto"
        className={buttonClasses({ variant: "outline", className: "w-full" })}
      >
        Pular por enquanto
      </Link>
    </div>
  );
}
