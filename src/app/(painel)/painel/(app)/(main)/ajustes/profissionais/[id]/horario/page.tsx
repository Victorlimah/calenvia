import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requireReadyBusiness } from "@/lib/business/current";
import { loadWeekHours } from "@/lib/business/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DayHours } from "@/lib/validation/business";
import { StaffHoursForm } from "./staff-hours-form";

export const metadata: Metadata = { title: "Horário do profissional — Calenvia" };

export default async function StaffHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await requireReadyBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name, staff_hours(weekday, is_open, opens_at, closes_at)")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!staff) notFound();
  const { days: businessDays } = await loadWeekHours(supabase, business.id);
  const own: DayHours[] | null = staff.staff_hours.length
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
        title={`Horário de ${staff.name}`}
        description="Use quando o profissional trabalha em dias ou horários diferentes do negócio."
        back={{ href: "/ajustes/profissionais", label: "Profissionais" }}
      />
      <StaffHoursForm
        staffId={staff.id}
        own={own}
        businessDays={businessDays.map((d) => ({ ...d, breaks: [] }))}
      />
    </PageBody>
  );
}
