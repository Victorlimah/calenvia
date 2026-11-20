"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui";
import { HoursEditor } from "@/components/painel/hours-editor";
import type { DayHours } from "@/lib/validation/business";
import { finishOnboardingAction } from "../../_actions/business";

export function HoursStep({ initial }: { initial: DayHours[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <HoursEditor
        initial={initial}
        submitLabel="Salvar e finalizar"
        onSaved={async () => {
          const result = await finishOnboardingAction();
          if (result.ok) router.push("/onboarding/tema");
          else setError(result.error);
        }}
      />
    </div>
  );
}
