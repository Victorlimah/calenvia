import { NextResponse } from "next/server";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import { getCurrentMember } from "@/lib/business/current";
import { formatTime, periodOf, toLocalDate, zonedDayRange } from "@/lib/dates";
import { monthCsv } from "@/lib/finance/csv";
import type { PaymentMethod } from "@/lib/metrics-owner/stats";
import { can } from "@/lib/permissions";
import { hasFeature } from "@/lib/plans";
import { monthRange } from "@/lib/reports/monthly";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** CSV do mês (CAL-127): atendimentos concluídos + entradas e despesas. Pro+. */
export async function GET(req: Request) {
  const member = await getCurrentMember();
  if (!member || !can(member, "finance.view"))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { business } = member;
  if (!hasFeature(business, "reports"))
    return NextResponse.json({ error: "A exportação faz parte do plano Pro+." }, { status: 403 });
  const tz = business.timezone;
  const mesParam = new URL(req.url).searchParams.get("mes") ?? "";
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(mesParam) ? mesParam : periodOf(new Date(), tz);
  const { from, to } = monthRange(mes);
  const supabase = await createSupabaseServerClient();
  const [{ data: appts }, { data: entries }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, customer_name, payment_method, services(name), staff_members(name)")
      .eq("business_id", business.id)
      .eq("status", "completed")
      .gte("starts_at", zonedDayRange(from, tz).start.toISOString())
      .lt("starts_at", zonedDayRange(to, tz).start.toISOString())
      .order("starts_at"),
    supabase
      .from("finance_entries")
      .select("kind, amount_cents, category, description, occurred_on")
      .eq("business_id", business.id)
      .gte("occurred_on", from)
      .lt("occurred_on", to)
      .order("occurred_on"),
  ]);
  const prices = await loadAppointmentPrices(
    supabase,
    business.id,
    (appts ?? []).map((a) => a.id),
  );
  const csv = monthCsv(
    (appts ?? []).map((a) => {
      const start = new Date(a.starts_at);
      return {
        date: toLocalDate(start, tz),
        time: formatTime(start, tz),
        customer: a.customer_name,
        service: a.services?.name ?? "",
        staff: a.staff_members?.name ?? "",
        priceCents: prices.get(a.id) ?? 0,
        paymentMethod: (a.payment_method as PaymentMethod | null) ?? null,
      };
    }),
    (entries ?? []).map((e) => ({
      date: e.occurred_on,
      kind: e.kind as "income" | "expense",
      category: e.category,
      description: e.description,
      amountCents: e.amount_cents,
    })),
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="financeiro-${business.slug}-${mes}.csv"`,
      "cache-control": "no-store",
    },
  });
}
