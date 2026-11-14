import { NextResponse, type NextRequest } from "next/server";
import { track } from "@/lib/metrics";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

/** Visita ao site (beacon do navegador, uma por sessão). Sem cookie nem IP guardado. */
export async function POST(req: NextRequest) {
  if (!(await checkRateLimit("beacon", clientIp(req.headers)))) {
    return new NextResponse(null, { status: 429 });
  }
  if (!BOT.test(req.headers.get("user-agent") ?? "")) {
    const ref = req.nextUrl.searchParams.get("ref")?.slice(0, 40) ?? "";
    await track("site_visit", ref ? { props: { ref } } : {});
  }
  return new NextResponse(null, { status: 204 });
}
