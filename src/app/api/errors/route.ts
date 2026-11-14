import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

const body = z.object({
  message: z.string().max(1000),
  name: z.string().max(100).optional(),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(100).optional(),
  path: z.string().max(300).optional(),
});

/** Recebe erros do navegador (error boundaries). Sem dados de usuário. */
export async function POST(req: NextRequest) {
  const text = await req.text();
  if (text.length > 8000) return new NextResponse(null, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text || "{}");
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = body.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const err = Object.assign(new Error(parsed.data.message), {
    name: parsed.data.name ?? "ClientError",
    stack: parsed.data.stack,
  });
  await reportError(err, {
    source: "client",
    path: parsed.data.path,
    digest: parsed.data.digest,
    extra: { userAgent: req.headers.get("user-agent")?.slice(0, 200) },
  });
  return new NextResponse(null, { status: 204 });
}
