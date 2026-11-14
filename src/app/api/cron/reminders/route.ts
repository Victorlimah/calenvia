import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runReminders } from "@/lib/whatsapp/reminders";
import { transportFromEnv } from "@/lib/whatsapp/transport";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const summary = await runReminders({
      db: createSupabaseAdminClient(),
      transport: transportFromEnv(),
    });
    if (summary.due) console.info("[lembretes]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    await reportError(e, { source: "cron", path: "/api/cron/reminders" });
    return NextResponse.json({ error: "Falha ao enviar lembretes." }, { status: 500 });
  }
}
