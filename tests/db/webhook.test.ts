import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const BIZ = "0b000000-0000-4000-8000-000000000001"; // Fortaleza
const TO = "5585955550301";
const WAMID = "wamid.TESTE-WEBHOOK-1";
const SECRET = "app-secret-teste";
const SENT_AT = "2033-02-10T12:00:00Z";
const PERIOD = "2033-02";
const ANA = "0b000000-0000-4000-8000-000000000002";
const CLIENT = "5585995550302"; // cliente dos dois negócios

let route: typeof import("@/app/api/webhooks/whatsapp/route");

function post(body: unknown, secret: string | null = SECRET) {
  const raw = JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret)
    headers["x-hub-signature-256"] =
      "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  return route.POST(
    new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
      method: "POST",
      body: raw,
      headers,
    }),
  );
}

const event = (status: string, ts: number, extra: object = {}) => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      changes: [
        {
          field: "messages",
          value: { statuses: [{ id: WAMID, status, timestamp: String(ts), ...extra }] },
        },
      ],
    },
  ],
});

async function row() {
  const { data } = await db
    .from("messages")
    .select("status, error")
    .eq("provider_message_id", WAMID)
    .single();
  return data!;
}
async function usage() {
  const { data } = await db
    .from("message_usage")
    .select("count")
    .eq("business_id", BIZ)
    .eq("period", PERIOD)
    .maybeSingle();
  return data?.count ?? 0;
}

async function cleanup() {
  await db.from("messages").delete().in("to_number", [TO, CLIENT]);
  await db.from("customers").delete().eq("whatsapp", CLIENT);
  await db.from("message_usage").delete().eq("business_id", BIZ).eq("period", PERIOD);
}

beforeAll(async () => {
  process.env.WHATSAPP_APP_SECRET = SECRET;
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verifica";
  route = await import("@/app/api/webhooks/whatsapp/route");
});

beforeEach(async () => {
  await cleanup();
  await db.from("messages").insert({
    business_id: BIZ,
    type: "confirmation",
    to_number: TO,
    template: "calenvia_confirmacao_v1",
    status: "sent",
    provider_message_id: WAMID,
    sent_at: SENT_AT,
  });
  await db.from("message_usage").insert({ business_id: BIZ, period: PERIOD, count: 5 });
});

afterAll(cleanup);

describe("webhook do WhatsApp (CAL-070)", () => {
  it("GET de verificação devolve o challenge só com o token certo", async () => {
    const ok = route.GET(
      new NextRequest(
        "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=987",
      ),
    );
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("987");
    const bad = route.GET(
      new NextRequest(
        "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=x&hub.challenge=987",
      ),
    );
    expect(bad.status).toBe(403);
  });

  it("assinatura inválida: 401 e nada muda", async () => {
    expect((await post(event("delivered", 2000000000), "outro")).status).toBe(401);
    expect((await post(event("delivered", 2000000000), null)).status).toBe(401);
    expect((await row()).status).toBe("sent");
  });

  it("entregue e depois lida; evento atrasado de entregue não volta", async () => {
    expect((await post(event("delivered", 2000000000))).status).toBe(200);
    expect((await row()).status).toBe("delivered");
    await post(event("read", 2000000060));
    expect((await row()).status).toBe("read");
    await post(event("delivered", 2000000000));
    expect((await row()).status).toBe("read");
  });

  it("falhou: grava o erro e devolve a mensagem à cota do mês", async () => {
    const res = await post(
      event("failed", 2000000000, {
        errors: [{ code: 131026, title: "Message undeliverable" }],
      }),
    );
    expect(await res.json()).toMatchObject({ received: 1, updated: 1 });
    expect(await row()).toEqual({ status: "failed", error: "131026 · Message undeliverable" });
    expect(await usage()).toBe(4);
  });

  it("id desconhecido é ignorado com 200 (a Meta não reenvia)", async () => {
    const res = await post({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.outro", status: "read" }] } }] }],
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ received: 1, updated: 0, unknown: 1 });
  });
});

describe("opt-out pela resposta do cliente (CAL-073)", () => {
  const reply = (text: string, contextId?: string) => ({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  // wa_id sem o 9, como a Meta às vezes manda
                  from: "558595550302",
                  type: "text",
                  timestamp: "2000000000",
                  text: { body: text },
                  ...(contextId ? { context: { id: contextId } } : {}),
                },
              ],
            },
          },
        ],
      },
    ],
  });

  async function optedOut() {
    const { data } = await db
      .from("customers")
      .select("business_id, opted_out_at")
      .eq("whatsapp", CLIENT)
      .order("business_id");
    return (data ?? []).map((c) => [c.business_id, c.opted_out_at !== null]);
  }

  beforeEach(async () => {
    await db.from("customers").insert([
      { business_id: BIZ, name: "Cliente Dois", whatsapp: CLIENT },
      { business_id: ANA, name: "Cliente Dois", whatsapp: CLIENT },
    ]);
  });

  it("SAIR respondendo a uma mensagem: só o negócio que enviou", async () => {
    await db.from("messages").insert({
      business_id: BIZ,
      type: "reminder",
      to_number: CLIENT,
      template: "calenvia_lembrete_v1",
      status: "read",
      provider_message_id: "wamid.CTX-OPTOUT",
    });
    const res = await post(reply("Sair", "wamid.CTX-OPTOUT"));
    expect(await res.json()).toMatchObject({ optedOut: 1 });
    expect(await optedOut()).toEqual([
      [BIZ, true],
      [ANA, false],
    ]);
  });

  it("SAIR sem contexto: todos os negócios; VOLTAR religa", async () => {
    await post(reply("PARAR"));
    expect(await optedOut()).toEqual([
      [BIZ, true],
      [ANA, true],
    ]);
    const res = await post(reply("voltar"));
    expect(await res.json()).toMatchObject({ optedIn: 2 });
    expect(await optedOut()).toEqual([
      [BIZ, false],
      [ANA, false],
    ]);
  });

  it("outras mensagens não mudam nada", async () => {
    await post(reply("Posso sair mais cedo?"));
    expect(await optedOut()).toEqual([
      [BIZ, false],
      [ANA, false],
    ]);
  });
});
