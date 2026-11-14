import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  applyStatusUpdates,
  parseStatusUpdates,
  verifySignature,
  verifySubscription,
} from "@/lib/whatsapp/webhook";

export const dynamic = "force-dynamic";

/** Verificação da URL do webhook no painel da Meta. */
export function GET(req: NextRequest) {
  const challenge = verifySubscription(
    req.nextUrl.searchParams,
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  );
  if (challenge === null) return new NextResponse("Token inválido.", { status: 403 });
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/** Status das mensagens (sent, delivered, read, failed). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), secret)) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }
  } else if (process.env.WHATSAPP_MODE === "live") {
    // Em produção a assinatura é obrigatória: sem o segredo, ninguém de fora altera status.
    console.error("[whatsapp:webhook] WHATSAPP_APP_SECRET ausente com WHATSAPP_MODE=live.");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const summary = await applyStatusUpdates(
      createSupabaseAdminClient(),
      parseStatusUpdates(payload),
    );
    return NextResponse.json(summary);
  } catch (e) {
    // 500 faz a Meta reenviar o evento mais tarde.
    console.error("[whatsapp:webhook] falha ao aplicar status", e);
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
