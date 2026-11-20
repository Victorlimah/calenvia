import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCurrentBusiness } from "@/lib/business/current";
import { canCreateBusinessInOnboarding, signupMode } from "@/lib/config/access";
import { supportWaLink } from "@/lib/config/support";
import { buttonClasses } from "@/components/ui";
import { StepOne } from "./step-one";

export const metadata: Metadata = { title: "Seu negócio — Calenvia" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const business = await getCurrentBusiness();
  if (business?.onboarding_completed_at) redirect("/");
  const ownerName = (user.user_metadata?.name as string | undefined) ?? "";
  // CAL-135: no modo convite, quem entrou sem negócio não cria um novo por aqui.
  if (!business && !canCreateBusinessInOnboarding(signupMode())) {
    return (
      <div className="space-y-6" data-testid="invite-only">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Sua conta ainda não tem um negócio
          </h1>
          <p className="mt-2 text-ink-2">
            A Calenvia está em acesso por convite. Se você recebeu um link de convite, abra-o para
            entrar no seu negócio. Se ainda não recebeu, fale com a gente.
          </p>
        </div>
        <a
          href={supportWaLink()}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ size: "lg", className: "w-full" })}
        >
          Pedir meu acesso no WhatsApp
        </a>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">
          {ownerName ? `Olá, ${ownerName.split(" ")[0]}! ` : ""}Vamos montar sua página
        </h1>
        <p className="mt-1 text-ink-2">Comece pelos dados do seu negócio.</p>
      </div>
      <StepOne
        defaults={
          business
            ? {
                name: business.name,
                segment: (business.segment ?? undefined) as never,
                address: business.address ?? "",
                address_reference: business.address_reference ?? "",
                whatsapp: business.whatsapp,
                instagram: business.instagram ?? "",
                slug: business.slug,
                timezone: business.timezone,
              }
            : undefined
        }
      />
    </div>
  );
}
