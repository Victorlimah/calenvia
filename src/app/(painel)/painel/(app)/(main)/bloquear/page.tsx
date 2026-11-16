import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { requireReadyMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { formatDate, formatTime, isLocalDate, todayIn } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BlockForm, BlockList } from "./block-form";

export const metadata: Metadata = { title: "Bloquear horário — Calenvia" };

export default async function BloquearPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const member = await requireReadyMember();
  const { business } = member;
  const all = can(member, "blocks.manage_all");
  const sp = await searchParams;
  const tz = business.timezone;
  const date = sp.data && isLocalDate(sp.data) ? sp.data : todayIn(tz);
  const supabase = await createSupabaseServerClient();
  const [{ data: allStaff }, { data: blocks }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("time_blocks")
      .select("id, starts_at, ends_at, reason, staff_members(name)")
      .eq("business_id", business.id)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(30),
  ]);
  const staff = (allStaff ?? []).filter((s) => all || s.id === member.staffMemberId);
  return (
    <PageBody>
      <PageHeader
        title="Bloquear horário"
        description="Folga, compromisso ou feriado: o horário some da sua página."
        back={{ href: `/agenda?data=${date}`, label: "Agenda" }}
      />
      <BlockForm staff={staff} date={date} allowAll={all} />
      <BlockList
        blocks={(blocks ?? []).map((b) => {
          const s = new Date(b.starts_at);
          const e = new Date(b.ends_at);
          return {
            id: b.id,
            who: b.staff_members?.name ?? "Todos",
            when: `${formatDate(s, tz).slice(0, 5)} ${formatTime(s, tz)} → ${formatDate(e, tz).slice(0, 5)} ${formatTime(e, tz)}`,
            reason: b.reason,
          };
        })}
      />
    </PageBody>
  );
}
