import type { Metadata } from "next";
import Link from "next/link";
import { AgendaRulesForm } from "@/components/painel/agenda-rules-form";
import { HoursEditor } from "@/components/painel/hours-editor";
import { TabBody, SectionHeader } from "@/components/painel/page-header";
import { requirePermission } from "@/lib/business/current";
import { loadWeekHours } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Horários — Calenvia" };

export default async function AjustesHorariosPage() {
  const { business } = await requirePermission("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { days } = await loadWeekHours(supabase, business.id);
  return (
    <TabBody>
      <SectionHeader
        title="Horário de funcionamento"
        description="Os horários livres da sua página seguem estes dias e intervalos."
      />
      <HoursEditor initial={days} />

      <section
        id="folgas"
        className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-5"
      >
        <h2 className="font-display text-xl font-bold text-ink">Folgas e feriados</h2>
        <p className="text-ink-2">
          Para fechar um dia, um feriado ou a folga de alguém, bloqueie o horário na agenda. O
          horário de cada profissional fica na aba Equipe.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/bloquear"
            className="inline-flex min-h-11 items-center font-semibold text-brand"
          >
            Bloquear um horário ou dia
          </Link>
          <Link
            href="/negocio/equipe"
            className="inline-flex min-h-11 items-center font-semibold text-brand"
          >
            Horário de cada profissional
          </Link>
        </div>
      </section>

      <section id="regras" className="scroll-mt-6 space-y-4">
        <SectionHeader
          title="Regras da agenda"
          description="Antecedência, dias à frente, intervalo entre horários e prazo para cancelar."
        />
        <AgendaRulesForm
          defaults={{
            slot_interval_min: business.slot_interval_min,
            min_notice_min: business.min_notice_min,
            max_days_ahead: business.max_days_ahead,
            cancel_notice_min: business.cancel_notice_min,
          }}
        />
      </section>
    </TabBody>
  );
}
