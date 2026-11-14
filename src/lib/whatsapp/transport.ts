/**
 * Transporte das mensagens: `mock` (só registra) ou `live` (WhatsApp Cloud API oficial).
 */
import { WHATSAPP_TEMPLATES, type TemplateKind } from "./templates";

export type SendTemplateInput = { to: string; kind: TemplateKind; params: string[] };
export type Transport = {
  mode: "mock" | "live";
  sendTemplate(input: SendTemplateInput): Promise<{ providerMessageId: string }>;
};

export const GRAPH_VERSION = "v21.0";

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

export function buildTemplatePayload({ to, kind, params }: SendTemplateInput) {
  const t = WHATSAPP_TEMPLATES[kind];
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: t.name,
      language: { code: t.language },
      components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
    },
  };
}

export function createMockTransport(log: (msg: string) => void = console.info): Transport {
  return {
    mode: "mock",
    async sendTemplate(input) {
      log(`[whatsapp:mock] ${input.kind} → ${input.to}: ${input.params.join(" | ")}`);
      return { providerMessageId: `mock-${crypto.randomUUID()}` };
    },
  };
}

export function createLiveTransport(opts: {
  phoneNumberId: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Transport {
  const doFetch = opts.fetchImpl ?? fetch;
  return {
    mode: "live",
    async sendTemplate(input) {
      const res = await doFetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${opts.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildTemplatePayload(input)),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };
      if (!res.ok || !body.messages?.[0]?.id) {
        throw new WhatsAppApiError(
          body.error?.message ?? `HTTP ${res.status}`,
          res.status,
          body.error?.code,
        );
      }
      return { providerMessageId: body.messages[0].id };
    },
  };
}

/** Transporte conforme as variáveis de ambiente. Sem credenciais, cai no mock. */
export function transportFromEnv(env: Record<string, string | undefined> = process.env): Transport {
  if (env.WHATSAPP_MODE === "live" && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_ACCESS_TOKEN) {
    return createLiveTransport({
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
    });
  }
  if (env.WHATSAPP_MODE === "live") {
    console.warn("[whatsapp] WHATSAPP_MODE=live sem credenciais: usando mock.");
  }
  return createMockTransport();
}
