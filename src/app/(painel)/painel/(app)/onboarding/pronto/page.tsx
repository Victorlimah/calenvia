import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShareLinkCard } from "@/components/painel/share-link-card";
import { ButtonLink } from "@/components/ui";
import { requireBusiness } from "@/lib/business/current";
import { businessDisplayHost, businessUrl } from "@/lib/hosts";
import { planOf } from "@/lib/plans";
import Link from "next/link";

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
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
          Sua página está no ar!
        </h1>
        <p className="mt-1 text-ink-2">
          Mande o link para seus clientes. Os agendamentos aparecem na sua agenda.
        </p>
      </div>
      <ShareLinkCard
        url={businessUrl(business.slug)}
        displayHost={businessDisplayHost(business.slug)}
      />
      <p className="text-sm text-ink-2">
        Seu plano: <strong className="text-ink">{planOf(business).name}</strong>.{" "}
        <Link href="/assinatura" className="font-semibold text-brand underline underline-offset-2">
          Ver assinatura
        </Link>
      </p>
      <ButtonLink href="/" size="lg" block variant="dark">
        Ir para a agenda
      </ButtonLink>
    </div>
  );
}
