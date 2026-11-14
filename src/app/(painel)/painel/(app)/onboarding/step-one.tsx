"use client";

import { useRouter } from "next/navigation";
import { BusinessInfoForm } from "@/components/painel/business-info-form";

export function StepOne({
  defaults,
}: {
  defaults?: React.ComponentProps<typeof BusinessInfoForm>["defaults"];
}) {
  const router = useRouter();
  return (
    <BusinessInfoForm
      defaults={defaults}
      submitLabel="Continuar"
      onSaved={() => router.push("/onboarding/servicos")}
    />
  );
}
