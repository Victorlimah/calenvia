import { NextResponse } from "next/server";
import { applyBillingEvent } from "@/lib/billing/events";
import { getBillingProvider, WebhookRejected } from "@/lib/billing/provider";

export const dynamic = "force-dynamic";

/**
 * Webhook do gateway (CAL-077). Valida a assinatura, normaliza e aplica cada evento
 * (idempotente). O pagamento simulado não usa webhook: recusa tudo.
 */
export async function POST(request: Request) {
  const provider = await getBillingProvider();
  let events;
  try {
    events = await provider.parseWebhook(request);
  } catch (e) {
    const message = e instanceof WebhookRejected ? e.message : "Webhook inválido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  for (const event of events) {
    const result = await applyBillingEvent(event);
    // Erro: responde 500 para o gateway tentar de novo (o evento fica marcado com o erro).
    if (result.status === "error") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }
  return NextResponse.json({ received: events.length });
}
