import type { Metadata } from "next";
import { openViewAs } from "@/lib/admin/view-as-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WEEKDAY_NAMES, WEEKDAY_ORDER } from "@/lib/weekdays";
import { AdminBody } from "../../../../ui";
import { ViewSection } from "../ui";

export const metadata: Metadata = { title: "Horários do cliente — Administração Calenvia" };

type Hours = {
  weekday: number;
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
};
type Break = { weekday: number; starts_at: string; ends_at: string };

const hhmm = (t: string | null) => (t ?? "").slice(0, 5);

export default async function ViewAsHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await openViewAs(id, "horarios");
  const db = createSupabaseAdminClient();
  const [hours, breaks, staffHours, staff] = await Promise.all([
    db
      .from("business_hours")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("business_id", business.id),
    db
      .from("business_breaks")
      .select("weekday, starts_at, ends_at")
      .eq("business_id", business.id)
      .order("starts_at"),
    db
      .from("staff_hours")
      .select("staff_member_id, weekday, is_open, opens_at, closes_at")
      .eq("business_id", business.id),
    db.from("staff_members").select("id, name").eq("business_id", business.id).order("name"),
  ]);
  const staffWithHours = (staff.data ?? []).filter((s) =>
    (staffHours.data ?? []).some((h) => h.staff_member_id === s.id),
  );

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Horários</h1>
      <ViewSection title="Horário do negócio" description={`Fuso: ${business.timezone}`}>
        <WeekTable hours={hours.data ?? []} breaks={breaks.data ?? []} />
      </ViewSection>
      {staffWithHours.map((s) => (
        <ViewSection key={s.id} title={`Horário próprio · ${s.name}`}>
          <WeekTable
            hours={(staffHours.data ?? []).filter((h) => h.staff_member_id === s.id)}
            breaks={[]}
          />
        </ViewSection>
      ))}
      {staffWithHours.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhum profissional com horário próprio: todos seguem o horário do negócio.
        </p>
      ) : null}
    </AdminBody>
  );
}

function WeekTable({ hours, breaks }: { hours: Hours[]; breaks: Break[] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {WEEKDAY_ORDER.map((d) => {
        const h = hours.find((x) => x.weekday === d);
        const dayBreaks = breaks.filter((b) => b.weekday === d);
        return (
          <div key={d} className="flex flex-wrap justify-between gap-2 py-2">
            <dt className="font-semibold text-ink">{WEEKDAY_NAMES[d]}</dt>
            <dd className="text-right text-ink-2">
              {h?.is_open ? `${hhmm(h.opens_at)}–${hhmm(h.closes_at)}` : "Fechado"}
              {h?.is_open && dayBreaks.length
                ? ` · intervalo ${dayBreaks.map((b) => `${hhmm(b.starts_at)}–${hhmm(b.ends_at)}`).join(", ")}`
                : ""}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
