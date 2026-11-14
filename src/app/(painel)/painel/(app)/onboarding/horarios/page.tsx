import type { Metadata } from "next";
import { requireBusiness } from "@/lib/business/current";
import { loadWeekHours } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HoursStep } from "./hours-step";

export const metadata: Metadata = { title: "Horários — Calenvia" };

export default async function OnboardingHorariosPage() {
  const business = await requireBusiness();
  const supabase = await createSupabaseServerClient();
  const { days } = await loadWeekHours(supabase, business.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">Quando você atende?</h1>
        <p className="mt-1 text-ink-2">
          Deixamos um horário comum preenchido. Ajuste os dias e o intervalo de almoço.
        </p>
      </div>
      <HoursStep initial={days} />
    </div>
  );
}
