import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { buttonClasses, EmptyState } from "@/components/ui";
import { requireReadyMember } from "@/lib/business/current";
import { loadWeekHours } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DayHours } from "@/lib/validation/business";
import { StaffHoursForm } from "../negocio/equipe/[id]/horario/staff-hours-form";

export const metadata: Metadata = { title: "Meus horários — Calenvia" };

/** CAL-112: cada pessoa ligada a um cadastro de profissional edita o próprio horário. */
export default async function MeusHorariosPage() {
  const member = await requireReadyMember();
  const { business } = member;
  if (!member.staffMemberId) {
    return (
      <PageBody>
        <PageHeader title="Meus horários" back={{ href: "/ajustes", label: "Ajustes" }} />
        <EmptyState
          title="Seu acesso não está ligado a um profissional"
          description="Peça para quem cuida da equipe ligar o seu acesso ao seu cadastro de profissional."
        />
      </PageBody>
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name, staff_hours(weekday, is_open, opens_at, closes_at)")
    .eq("id", member.staffMemberId)
    .eq("business_id", business.id)
    .maybeSingle();
  const { days: businessDays } = await loadWeekHours(supabase, business.id);
  const own: DayHours[] | null = staff?.staff_hours.length
    ? Array.from({ length: 7 }, (_, weekday) => {
        const h = staff.staff_hours.find((x) => x.weekday === weekday);
        return {
          weekday,
          is_open: h?.is_open ?? false,
          opens_at: h?.opens_at?.slice(0, 5) ?? null,
          closes_at: h?.closes_at?.slice(0, 5) ?? null,
          breaks: [],
        };
      })
    : null;
  return (
    <PageBody>
      <PageHeader
        title="Meus horários"
        description="Seus dias e horários de trabalho. Para folga, almoço ou compromisso, bloqueie o horário."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <Link href="/bloquear" className={buttonClasses({ variant: "outline", className: "w-full" })}>
        Bloquear um horário
      </Link>
      {staff ? (
        <StaffHoursForm
          staffId={staff.id}
          own={own}
          businessDays={businessDays.map((d) => ({ ...d, breaks: [] }))}
        />
      ) : null}
    </PageBody>
  );
}
