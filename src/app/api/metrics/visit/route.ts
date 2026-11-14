import { NextResponse, type NextRequest } from "next/server";
import { track } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|preview|headless|lighthouse/i;

/** Visita ao site (beacon do navegador, uma por sessão). Sem cookie nem IP guardado. */
export async function POST(req: NextRequest) {
  if (!BOT.test(req.headers.get("user-agent") ?? "")) {
    const ref = req.nextUrl.searchParams.get("ref")?.slice(0, 40) ?? "";
    await track("site_visit", ref ? { props: { ref } } : {});
  }
  return new NextResponse(null, { status: 204 });
}
