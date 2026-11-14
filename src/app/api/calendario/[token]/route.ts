import { NextResponse, type NextRequest } from "next/server";
import { formatDuration } from "@/lib/dates";
import { buildIcsCalendar } from "@/lib/ics";
import { formatPhone } from "@/lib/phone";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAY = 86400000;

/** Feed ICS privado do negócio (CAL-107). ?profissional=<id> filtra por profissional. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token))
    return new NextResponse("Não encontrado", { status: 404 });
  if (!(await checkRateLimit("lookup", clientIp(req.headers)))) {
    return new NextResponse("Muitas tentativas", { status: 429 });
  }
  const db = createSupabaseAdminClient();
  const { data: b } = await db
    .from("businesses")
    .select("id, name, address")
    .eq("calendar_token", token)
    .maybeSingle();
  if (!b) return new NextResponse("Não encontrado", { status: 404 });

  const staff = req.nextUrl.searchParams.get("profissional");
  let q = db
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, customer_name, customer_whatsapp, notes, services(name, duration_min), staff_members(name)",
    )
    .eq("business_id", b.id)
    .gte("starts_at", new Date(Date.now() - 30 * DAY).toISOString())
    .lt("starts_at", new Date(Date.now() + 180 * DAY).toISOString())
    .order("starts_at")
    .limit(2000);
  if (staff && /^[0-9a-f-]{36}$/i.test(staff)) q = q.eq("staff_member_id", staff);
  const { data: appts } = await q;

  const ics = buildIcsCalendar(
    (appts ?? []).map((a) => ({
      uid: `${a.id}@calenvia`,
      title: `${a.services?.name ?? "Atendimento"} · ${a.customer_name}`,
      description: [
        `Cliente: ${a.customer_name} (${formatPhone(a.customer_whatsapp)})`,
        `Profissional: ${a.staff_members?.name ?? ""}`,
        a.services?.duration_min ? `Duração: ${formatDuration(a.services.duration_min)}` : "",
        a.notes ? `Observações: ${a.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      location: b.address,
      start: new Date(a.starts_at),
      end: new Date(a.ends_at),
      status: a.status === "canceled" ? ("CANCELLED" as const) : ("CONFIRMED" as const),
      alarmMin: null,
    })),
    { name: `${b.name} · Calenvia`, refreshMinutes: 15 },
  );
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
