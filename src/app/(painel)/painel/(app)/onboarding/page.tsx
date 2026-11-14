import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getCurrentBusiness } from "@/lib/business/current";
import { StepOne } from "./step-one";

export const metadata: Metadata = { title: "Seu negócio — Calenvia" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const business = await getCurrentBusiness();
  if (business?.onboarding_completed_at) redirect("/");
  const ownerName = (user.user_metadata?.name as string | undefined) ?? "";
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
