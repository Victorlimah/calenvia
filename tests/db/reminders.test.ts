import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { runReminders } from "@/lib/whatsapp/reminders";
import type { SendTemplateInput, Transport } from "@/lib/whatsapp/transport";

process.env.NEXT_PUBLIC_ROOT_DOMAIN ??= "localhost:3000";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ZE = "0b000000-0000-4000-8000-000000000001"; // Pro
const ANA = "0b000000-0000-4000-8000-000000000002"; // Básico
const CORTE = "0c000000-0000-4000-8000-000000000001";
const MANICURE = "0c000000-0000-4000-8000-000000000011";
const PHONES = ["5585955550201", "5585955550202", "5585955550203", "5511955550204"];
const H = 60 * 60 * 1000;
// Bem no futuro, para não pegar agendamentos do seed nem de outros testes.
const START = new Date("2032-05-10T13:00:00Z");

const sent: SendTemplateInput[] = [];
const transport: Transport = {
  mode: "mock",
  async sendTemplate(input) {
    sent.push(input);
    return { providerMessageId: `rem-${crypto.randomUUID()}` };
  },
};

async function staffFor(serviceId: string) {
  const { data } = await db
    .from("staff_services")
    .select("staff_member_id")
    .eq("service_id", serviceId)
    .limit(1)
    .single();
  return data!.staff_member_id;
}

async function makeAppointment(opts: {
  business: string;
  service: string;
  phone: string;
  start: Date;
  optedOut?: boolean;
  status?: "confirmed" | "canceled";
}) {
  const { data: c } = await db
    .from("customers")
    .insert({
      business_id: opts.business,
      name: "Lembrete Teste",
      whatsapp: opts.phone,
      opted_out_at: opts.optedOut ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  const { data, error } = await db
    .from("appointments")
    .insert({
      business_id: opts.business,
      customer_id: c!.id,
      service_id: opts.service,
      staff_member_id: await staffFor(opts.service),
      starts_at: opts.start.toISOString(),
      ends_at: new Date(opts.start.getTime() + 30 * 60 * 1000).toISOString(),
      customer_name: "Lembrete Teste",
      customer_whatsapp: opts.phone,
      status: opts.status ?? "confirmed",
      canceled_at: opts.status === "canceled" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}

async function cleanup() {
  await db.from("messages").delete().in("to_number", PHONES);
  await db.from("appointments").delete().in("customer_whatsapp", PHONES);
  await db.from("customers").delete().in("whatsapp", PHONES);
  await db.from("message_usage").delete().in("business_id", [ZE, ANA]).like("period", "2032-%");
}

let main: string;

beforeAll(async () => {
  await cleanup();
  main = await makeAppointment({ business: ZE, service: CORTE, phone: PHONES[0], start: START });
  // não recebem: cancelado (Pro), opt-out (Pro), plano Básico
  await makeAppointment({
    business: ZE,
    service: CORTE,
    phone: PHONES[1],
    start: new Date(START.getTime() + H),
    status: "canceled",
  });
  await makeAppointment({
    business: ZE,
    service: CORTE,
    phone: PHONES[2],
    start: new Date(START.getTime() + 2 * H),
    optedOut: true,
  });
  await makeAppointment({ business: ANA, service: MANICURE, phone: PHONES[3], start: START });
});

afterAll(cleanup);

async function reminders(appointmentId: string) {
  const { data } = await db
    .from("messages")
    .select("status, appointment_starts_at")
    .eq("appointment_id", appointmentId)
    .eq("type", "reminder")
    .order("created_at");
  return data ?? [];
}

describe("cron de lembretes (CAL-069)", () => {
  it("antes de 24 h do horário nada sai", async () => {
    const r = await runReminders({ db, transport, now: new Date(START.getTime() - 25 * H) });
    expect(r.sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("24 h antes: só o agendamento confirmado do Pro, sem opt-out, recebe", async () => {
    const r = await runReminders({ db, transport, now: new Date(START.getTime() - 24 * H) });
    expect(r).toMatchObject({ checked: 1, due: 1, sent: 1, failed: 0 });
    expect(sent.map((s) => [s.kind, s.to])).toEqual([["reminder", PHONES[0]]]);
    expect(await reminders(main)).toEqual([
      { status: "sent", appointment_starts_at: expect.any(String) },
    ]);
  });

  it("rodar de novo (10 min depois) não duplica", async () => {
    const r = await runReminders({
      db,
      transport,
      now: new Date(START.getTime() - 24 * H + 10 * 60 * 1000),
    });
    expect(r.sent).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it("remarcado para outro dia: novo lembrete para o novo horário", async () => {
    const newStart = new Date(START.getTime() + 24 * H);
    await db
      .from("appointments")
      .update({
        starts_at: newStart.toISOString(),
        ends_at: new Date(newStart.getTime() + 30 * 60 * 1000).toISOString(),
      })
      .eq("id", main);
    const r = await runReminders({ db, transport, now: new Date(newStart.getTime() - 23 * H) });
    expect(r.sent).toBe(1);
    const rows = await reminders(main);
    expect(rows).toHaveLength(2);
    expect(new Date(rows[1].appointment_starts_at!).getTime()).toBe(newStart.getTime());
  });
});

describe("rota /api/cron/reminders", () => {
  it("sem o segredo devolve 401 (e não toca no banco)", async () => {
    process.env.CRON_SECRET = "segredo-de-teste";
    const { GET } = await import("@/app/api/cron/reminders/route");
    const res = await GET(new NextRequest("http://localhost:3000/api/cron/reminders"));
    expect(res.status).toBe(401);
    const bad = await GET(
      new NextRequest("http://localhost:3000/api/cron/reminders", {
        headers: { authorization: "Bearer errado" },
      }),
    );
    expect(bad.status).toBe(401);
  });
});
