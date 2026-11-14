import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShareLinkCard } from "@/components/painel/share-link-card";
import { ButtonLink } from "@/components/ui";
import { requireBusiness } from "@/lib/business/current";
import { businessDisplayHost, businessUrl } from "@/lib/hosts";

export const metadata: Metadata = { title: "Tudo pronto — Calenvia" };

export default async function OnboardingProntoPage() {
  const business = await requireBusiness();
  if (!business.onboarding_completed_at) redirect("/onboarding/horarios");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h1 className="font-display text-ink mt-2 text-3xl font-extrabold">
          Sua página está no ar!
        </h1>
        <p className="text-ink-2 mt-1">
          Mande o link para seus clientes. Os agendamentos aparecem na sua agenda.
        </p>
      </div>
      <ShareLinkCard
        url={businessUrl(business.slug)}
        displayHost={businessDisplayHost(business.slug)}
      />
      <ButtonLink href="/" size="lg" block variant="dark">
        Ir para a agenda
      </ButtonLink>
    </div>
  );
}
