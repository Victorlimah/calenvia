import { NextResponse, type NextRequest } from "next/server";
import { runBillingCron } from "@/lib/billing/lifecycle";
import { isCronAuthorized } from "@/lib/cron";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron diário da cobrança (CAL-077): suspensão após a carência, cancelamentos e downgrades. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const summary = await runBillingCron();
    console.info("[cobrança]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    await reportError(e, { source: "cron", path: "/api/cron/billing" });
    return NextResponse.json({ error: "Falha no cron da cobrança." }, { status: 500 });
  }
}
