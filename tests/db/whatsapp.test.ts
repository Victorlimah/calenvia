import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { sendWhatsApp, type SendBusiness } from "@/lib/whatsapp/send";
import type { SendTemplateInput, Transport } from "@/lib/whatsapp/transport";

process.env.NEXT_PUBLIC_ROOT_DOMAIN ??= "localhost:3000";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  { auth: { persistSession: false } },
);

const BIZ = "0b000000-0000-4000-8000-000000000001";
const CORTE = "0c000000-0000-4000-8000-000000000001";
const PHONE = "5585955550099";
// Período isolado: não mistura com a contagem real do seed.
const NOW = new Date("2031-03-10T12:00:00Z");
const PERIOD = "2031-03";

let business: SendBusiness;
let appointmentId: string;
let customerId: string;

function fakeTransport(fail = false) {
  const sent: SendTemplateInput[] = [];
  const transport: Transport = {
    mode: "mock",
    async sendTemplate(input) {
      if (fail) throw new Error("Falha simulada da Meta");
      sent.push(input);
      return { providerMessageId: `test-${crypto.randomUUID()}` };
    },
  };
  return { transport, sent };
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

async function log() {
  const { data } = await db
    .from("messages")
    .select("type, status, skip_reason")
    .eq("appointment_id", appointmentId)
    .order("created_at");
  return data ?? [];
}

async function cleanup() {
  await db.from("appointments").delete().eq("customer_whatsapp", PHONE);
  await db.from("customers").delete().eq("whatsapp", PHONE);
  await db.from("message_usage").delete().eq("business_id", BIZ).eq("period", PERIOD);
}

beforeAll(async () => {
  await cleanup();
  const { data: b } = await db
    .from("businesses")
    .select("id, slug, name, timezone, plan, plan_status, message_limit_override")
    .eq("id", BIZ)
    .single();
  business = b!;
  const { data: staff } = await db
    .from("staff_services")
    .select("staff_member_id")
    .eq("service_id", CORTE)
    .limit(1)
    .single();
  const { data: c } = await db
    .from("customers")
    .insert({ business_id: BIZ, name: "Maria Teste", whatsapp: PHONE })
    .select("id")
    .single();
  customerId = c!.id;
  const { data: a, error } = await db
    .from("appointments")
    .insert({
      business_id: BIZ,
      customer_id: customerId,
      service_id: CORTE,
      staff_member_id: staff!.staff_member_id,
      starts_at: "2031-03-20T13:00:00Z",
      ends_at: "2031-03-20T13:30:00Z",
      customer_name: "Maria Teste",
      customer_whatsapp: PHONE,
      price_cents: 4000,
      source: "link",
    })
    .select("id")
    .single();
  if (error) throw error;
  appointmentId = a!.id;
});

beforeEach(async () => {
  await db.from("messages").delete().eq("appointment_id", appointmentId);
  await db.from("message_usage").delete().eq("business_id", BIZ).eq("period", PERIOD);
  await db.from("customers").update({ opted_out_at: null }).eq("id", customerId);
  await db.from("appointments").update({ status: "confirmed" }).eq("id", appointmentId);
});

afterAll(cleanup);

const send = (transport: Transport, b = business, type = "confirmation" as const) =>
  sendWhatsApp({ db, transport, now: NOW }, { business: b, appointmentId, type });

describe("sendWhatsApp no banco (CAL-068 / CAL-071)", () => {
  it("Pro: envia o template, grava em messages e conta no mês", async () => {
    const { transport, sent } = fakeTransport();
    const r = await send(transport);
    expect(r.status).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: PHONE, kind: "confirmation" });
    // nome, negócio, serviço, profissional, dia, data, hora, link de gerenciar
    expect(sent[0].params[0]).toBe("Maria");
    expect(sent[0].params[1]).toBe("Barbearia do Zé");
    expect(sent[0].params[6]).toBe("10:00"); // 13:00Z em Fortaleza
    expect(sent[0].params[7]).toMatch(/barbearia-do-ze\.localhost:3000\/gerenciar\/\w{6}/);

    const { data: rows } = await db
      .from("messages")
      .select("type, status, template, to_number, provider_message_id, sent_at")
      .eq("appointment_id", appointmentId);
    expect(rows).toHaveLength(1);
    expect(rows![0]).toMatchObject({
      type: "confirmation",
      status: "sent",
      template: "calenvia_confirmacao_v1",
      to_number: PHONE,
    });
    expect(rows![0].provider_message_id).toMatch(/^test-/);
    expect(rows![0].sent_at).not.toBeNull();
    expect(await usage()).toBe(1);
  });

  it("erro na Meta: grava como falha, não conta e devolve o wa.me", async () => {
    const r = await send(fakeTransport(true).transport);
    expect(r.status).toBe("failed");
    if (r.status !== "failed") return;
    expect(r.fallbackUrl).toMatch(new RegExp(`^https://wa\\.me/${PHONE}\\?text=`));
    const { data: rows } = await db
      .from("messages")
      .select("status, error")
      .eq("appointment_id", appointmentId);
    expect(rows).toEqual([{ status: "failed", error: "Falha simulada da Meta" }]);
    expect(await usage()).toBe(0);
  });

  it("Básico: não envia, registra skipped (plan_basic) e devolve o wa.me", async () => {
    const { transport, sent } = fakeTransport();
    const r = await send(transport, { ...business, plan: "basic" });
    expect(r).toMatchObject({ status: "skipped", reason: "plan_basic" });
    expect(sent).toHaveLength(0);
    expect(await log()).toEqual([
      { type: "confirmation", status: "skipped", skip_reason: "plan_basic" },
    ]);
    expect(await usage()).toBe(0);
  });

  it("cota do Pro esgotada no mês: não envia", async () => {
    await db.from("message_usage").insert({ business_id: BIZ, period: PERIOD, count: 300 });
    const { transport, sent } = fakeTransport();
    const r = await send(transport);
    expect(r).toMatchObject({ status: "skipped", reason: "no_quota" });
    expect(sent).toHaveLength(0);
    expect(await usage()).toBe(300);
    expect(await log()).toEqual([
      { type: "confirmation", status: "skipped", skip_reason: "no_quota" },
    ]);
  });

  it("cliente com opt-out: não envia", async () => {
    await db.from("customers").update({ opted_out_at: NOW.toISOString() }).eq("id", customerId);
    const r = await send(fakeTransport().transport);
    expect(r).toMatchObject({ status: "skipped", reason: "opted_out" });
    expect(await log()).toEqual([
      { type: "confirmation", status: "skipped", skip_reason: "opted_out" },
    ]);
  });

  it("CAL-111: confirmação desligada no negócio → skipped e a cota não muda", async () => {
    await db
      .from("business_message_settings")
      .update({ confirmation_enabled: false })
      .eq("business_id", BIZ);
    try {
      const { transport, sent } = fakeTransport();
      const r = await send(transport);
      expect(r).toMatchObject({ status: "skipped", reason: "disabled_by_business" });
      expect(sent).toHaveLength(0);
      expect(await usage()).toBe(0);
      expect(await log()).toEqual([
        { type: "confirmation", status: "skipped", skip_reason: "disabled_by_business" },
      ]);
    } finally {
      await db
        .from("business_message_settings")
        .update({ confirmation_enabled: true })
        .eq("business_id", BIZ);
    }
  });

  it("CAL-111: agendamento com mensagens desligadas não recebe nada", async () => {
    await db.from("appointments").update({ messages_enabled: false }).eq("id", appointmentId);
    try {
      const { transport, sent } = fakeTransport();
      await send(transport);
      await sendWhatsApp(
        { db, transport, now: NOW },
        { business, appointmentId, type: "reminder", reminderOffsetMin: 120 },
      );
      await db.from("appointments").update({ status: "canceled" }).eq("id", appointmentId);
      await sendWhatsApp(
        { db, transport, now: NOW },
        { business, appointmentId, type: "cancellation" },
      );
      expect(sent).toHaveLength(0);
      expect(await usage()).toBe(0);
      expect((await log()).map((m) => `${m.type}:${m.skip_reason}`)).toEqual([
        "confirmation:disabled_for_appointment",
        "reminder:disabled_for_appointment",
        "cancellation:disabled_for_appointment",
      ]);
    } finally {
      await db.from("appointments").update({ messages_enabled: true }).eq("id", appointmentId);
    }
  });

  it("agendamento cancelado: sem confirmação; com aviso de cancelamento", async () => {
    await db.from("appointments").update({ status: "canceled" }).eq("id", appointmentId);
    const { transport, sent } = fakeTransport();
    expect(await send(transport)).toMatchObject({ status: "skipped", reason: "canceled" });
    const r = await sendWhatsApp(
      { db, transport, now: NOW },
      { business, appointmentId, type: "cancellation" },
    );
    expect(r.status).toBe("sent");
    expect(sent.map((s) => s.kind)).toEqual(["cancellation"]);
  });

  it("corrida: com 1 mensagem restante, dois envios simultâneos só deixam sair um", async () => {
    await db.from("message_usage").insert({ business_id: BIZ, period: PERIOD, count: 299 });
    const { transport, sent } = fakeTransport();
    const results = await Promise.all([
      send(transport),
      sendWhatsApp({ db, transport, now: NOW }, { business, appointmentId, type: "reminder" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["sent", "skipped"]);
    expect(sent).toHaveLength(1);
    expect(await usage()).toBe(300);
  });

  it("a reserva de cota só pode ser chamada pelo servidor", async () => {
    const anon = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      { auth: { persistSession: false } },
    );
    const { error } = await anon.rpc("consume_message_quota", {
      p_business_id: BIZ,
      p_period: PERIOD,
      p_limit: 1000,
    });
    expect(error).not.toBeNull();
    expect(await usage()).toBe(0);
  });
});
