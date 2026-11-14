import { NextResponse, type NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { resetDemo } from "@/lib/demo";
import { reportError } from "@/lib/monitoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Recria a demonstração pública todo dia (CAL-086). */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json(await resetDemo(createSupabaseAdminClient()));
  } catch (e) {
    await reportError(e, { source: "cron", path: "/api/cron/demo-reset" });
    return NextResponse.json({ error: "Falha ao recriar a demonstração." }, { status: 500 });
  }
}
