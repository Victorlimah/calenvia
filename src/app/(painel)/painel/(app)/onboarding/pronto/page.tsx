import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShareLinkCard } from "@/components/painel/share-link-card";
import { ButtonLink } from "@/components/ui";
import { requireBusiness } from "@/lib/business/current";
import { businessDisplayHost, businessUrl } from "@/lib/hosts";
import { needsCheckout, planOf } from "@/lib/plans";
import { isBillingEnabled } from "@/lib/config/access";

export const metadata: Metadata = { title: "Tudo pronto — Calenvia" };

export default async function OnboardingProntoPage() {
  const business = await requireBusiness();
  if (!business.onboarding_completed_at) redirect("/onboarding/horarios");
  // CAL-135: sem cobrança, não há "Assinar e ativar" (a conta convidada já nasce ativa).
  const billing = isBillingEnabled();
  const pending = billing && needsCheckout(business);
  const awaiting = !billing && needsCheckout(business);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-4xl" aria-hidden="true">
          🎉
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">
          {pending || awaiting ? "Sua página está pronta!" : "Sua página está no ar!"}
        </h1>
        <p className="mt-1 text-ink-2">
          {pending
            ? "Falta só ativar a assinatura para ela começar a receber agendamentos."
            : awaiting
              ? "Falta só a equipe da Calenvia liberar sua conta. Avisamos você no WhatsApp."
              : "Mande o link para seus clientes. Os agendamentos aparecem na sua agenda."}
        </p>
      </div>
      <ShareLinkCard
        url={businessUrl(business.slug)}
        displayHost={businessDisplayHost(business.slug)}
      />
      {billing ? (
        <p className="text-sm text-ink-2">
          Seu plano: <strong className="text-ink">{planOf(business).name}</strong>.
        </p>
      ) : null}
      {pending ? (
        <ButtonLink href="/assinatura/checkout" size="lg" block>
          Assinar e ativar
        </ButtonLink>
      ) : (
        <ButtonLink href="/" size="lg" block variant="dark">
          Ir para a agenda
        </ButtonLink>
      )}
    </div>
  );
}
