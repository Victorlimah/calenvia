import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerAppointment } from "@/lib/booking";
import { addLocalDays, todayIn } from "@/lib/dates";
import { WALK_IN_PHONE } from "@/lib/phone";
import type { Database } from "@/lib/supabase/types";

// "Registrar atendimento": atendimento que já aconteceu, lançado direto como concluído.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const db = createClient<Database>(URL, SERVICE_KEY, { auth: { persistSession: false } });
// A ação roda como o dono (a função do banco que conclui o atendimento confere o papel).
const owner = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
const BIZ = "0b000000-0000-4000-8000-000000000001";
const CORTE = "0c000000-0000-4000-8000-000000000001";
const ZE = "0d000000-0000-4000-8000-000000000001";
const PHONE = "5585977770091";
const NOTE = "teste-registrar";

let business: Database["public"]["Tables"]["businesses"]["Row"];
let day: string; // uma data passada sem agendamentos do seed

async function cleanup() {
  await db.from("appointments").delete().eq("business_id", BIZ).eq("notes", NOTE);
  await db.from("customers").delete().eq("business_id", BIZ).eq("whatsapp", PHONE);
}

beforeAll(async () => {
  const { data } = await db.from("businesses").select("*").eq("id", BIZ).single();
  business = data!;
  day = addLocalDays(todayIn(business.timezone), -20);
  await owner.auth.signInWithPassword({ email: "ze@calenvia.dev", password: "calenvia123" });
  await cleanup();
});
afterAll(cleanup);

const base = () => ({
  business,
  serviceId: CORTE,
  staffId: ZE,
  date: day,
  priceCents: 3500,
  notes: NOTE,
});

describe("registrar atendimento", () => {
  it("lança um atendimento passado já concluído, com valor e cliente com WhatsApp", async () => {
    const r = await registerAppointment(owner, {
      ...base(),
      time: "10:00",
      customer: { name: "Cliente Registrado", whatsapp: "(85) 9 7777-0091" },
    });
    expect("id" in r).toBe(true);
    const { data: a } = await db
      .from("appointments")
      .select("status, source, price_cents, messages_enabled, customer_name")
      .eq("id", (r as { id: string }).id)
      .single();
    expect(a).toMatchObject({
      status: "completed",
      source: "manual",
      price_cents: 3500,
      messages_enabled: false,
      customer_name: "Cliente Registrado",
    });
  });

  it("sem WhatsApp usa o cliente avulso (que não recebe mensagem) e guarda o nome digitado", async () => {
    const r = await registerAppointment(owner, {
      ...base(),
      time: "11:00",
      customer: { name: "João da Esquina" },
    });
    expect("id" in r).toBe(true);
    const { data: a } = await db
      .from("appointments")
      .select("customer_name, customer_whatsapp, customers(opted_out_at)")
      .eq("id", (r as { id: string }).id)
      .single();
    expect(a?.customer_name).toBe("João da Esquina");
    expect(a?.customer_whatsapp).toBe(WALK_IN_PHONE);
    expect(a?.customers?.opted_out_at).not.toBeNull();
    // Segundo avulso reaproveita o mesmo cliente.
    const r2 = await registerAppointment(owner, {
      ...base(),
      time: "12:00",
      customer: { name: "Outro Avulso" },
    });
    expect("id" in r2).toBe(true);
    const { count } = await db
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", BIZ)
      .eq("whatsapp", WALK_IN_PHONE);
    expect(count).toBe(1);
  });

  it("recusa horário no futuro", async () => {
    const r = await registerAppointment(owner, {
      ...base(),
      date: addLocalDays(todayIn(business.timezone), 2),
      time: "10:00",
      customer: { name: "Futuro" },
    });
    expect(r).toEqual({ error: "future" });
  });

  it("não deixa dois atendimentos sobrepostos do mesmo profissional", async () => {
    const r = await registerAppointment(owner, {
      ...base(),
      time: "10:15",
      customer: { name: "Sobreposto" },
    });
    expect(r).toEqual({ error: "overlap" });
  });

  it("serviço de outro negócio é inválido", async () => {
    const r = await registerAppointment(owner, {
      ...base(),
      serviceId: "00000000-0000-4000-8000-000000000000",
      time: "15:00",
      customer: { name: "Inválido" },
    });
    expect(r).toEqual({ error: "invalid" });
  });
});
