import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addLocalDays, localDateTimeToUtc, todayIn, weekdayOf } from "@/lib/dates";
import { createAppointment, BookingError, upsertCustomer } from "@/lib/booking";
import type { Database } from "@/lib/supabase/types";

// Supabase local (chaves públicas de demonstração do CLI).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const db = createClient<Database>(URL, SERVICE_KEY, { auth: { persistSession: false } });
const BIZ = "0b000000-0000-4000-8000-000000000001"; // Barbearia do Zé (seed)
const CORTE = "0c000000-0000-4000-8000-000000000001";
const BARBA = "0c000000-0000-4000-8000-000000000002";
const ZE = "0d000000-0000-4000-8000-000000000001";
const RAFAEL = "0d000000-0000-4000-8000-000000000002";
const TEST_PHONES = ["5585977770001", "5585977770002", "5585977770003"];

let business: Database["public"]["Tables"]["businesses"]["Row"];
let date: string; // uma quarta-feira daqui a ~2 semanas (sem agendamentos do seed)

async function cleanup() {
  await db
    .from("appointments")
    .delete()
    .eq("business_id", BIZ)
    .in("customer_whatsapp", TEST_PHONES);
  await db.from("customers").delete().eq("business_id", BIZ).in("whatsapp", TEST_PHONES);
}

beforeAll(async () => {
  const { data } = await db.from("businesses").select("*").eq("id", BIZ).single();
  business = data!;
  let d = addLocalDays(todayIn(business.timezone), 14);
  while (weekdayOf(d) !== 3) d = addLocalDays(d, 1);
  date = d;
  await cleanup();
});
afterAll(cleanup);

const at = (time: string) => localDateTimeToUtc(date, time, business.timezone);

describe("criação de agendamento com revalidação", () => {
  it("cria com profissional escolhido e copia preço e cliente", async () => {
    const a = await createAppointment(db, {
      business,
      serviceId: CORTE,
      staffId: ZE,
      start: at("09:00"),
      customer: { name: "  Teste   Um ", whatsapp: "(85) 9 7777-0001" },
      source: "link",
    });
    expect(a.staff_member_id).toBe(ZE);
    const { data: priced } = await db
      .from("appointments")
      .select("price_cents")
      .eq("id", a.id)
      .single();
    expect(priced?.price_cents).toBe(4000);
    expect(a.customer_name).toBe("Teste Um");
    expect(a.customer_whatsapp).toBe("5585977770001");
    expect(a.manage_code).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("recusa o mesmo horário para o mesmo profissional", async () => {
    await expect(
      createAppointment(db, {
        business,
        serviceId: CORTE,
        staffId: ZE,
        start: at("09:00"),
        customer: { name: "Teste Dois", whatsapp: "85977770002" },
        source: "link",
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("sem preferência atribui a quem está livre", async () => {
    const a = await createAppointment(db, {
      business,
      serviceId: CORTE,
      staffId: null,
      start: at("09:00"),
      customer: { name: "Teste Dois", whatsapp: "85977770002" },
      source: "link",
    });
    expect(a.staff_member_id).toBe(RAFAEL);
  });

  it("recusa profissional que não faz o serviço", async () => {
    await expect(
      createAppointment(db, {
        business,
        serviceId: BARBA,
        staffId: RAFAEL,
        start: at("10:00"),
        customer: { name: "Teste Três", whatsapp: "85977770003" },
        source: "link",
      }),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it("recusa horário do almoço e fora do intervalo de slots", async () => {
    for (const time of ["12:00", "09:10"]) {
      await expect(
        createAppointment(db, {
          business,
          serviceId: CORTE,
          staffId: ZE,
          start: at(time),
          customer: { name: "Teste Três", whatsapp: "85977770003" },
          source: "link",
        }),
      ).rejects.toMatchObject({ code: "unavailable" });
    }
  });

  it("a constraint do banco barra corrida entre dois pedidos simultâneos", async () => {
    const make = (phone: string) =>
      createAppointment(db, {
        business,
        serviceId: CORTE,
        staffId: ZE,
        start: at("15:00"),
        customer: { name: "Corrida", whatsapp: phone },
        source: "link",
      });
    const results = await Promise.allSettled([make("85977770002"), make("85977770003")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(["conflict", "unavailable"]).toContain((failed[0].reason as BookingError).code);
  });

  it("cancelado libera o horário", async () => {
    await db
      .from("appointments")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("business_id", BIZ)
      .eq("starts_at", at("09:00").toISOString())
      .eq("staff_member_id", ZE);
    const a = await createAppointment(db, {
      business,
      serviceId: CORTE,
      staffId: ZE,
      start: at("09:00"),
      customer: { name: "Teste Três", whatsapp: "85977770003" },
      source: "link",
    });
    expect(a.status).toBe("confirmed");
  });
});

describe("cadastro automático do cliente", () => {
  it("reaproveita pelo WhatsApp e atualiza o nome", async () => {
    const a = await upsertCustomer(db, BIZ, { name: "Nome Antigo", whatsapp: "85 97777-0001" });
    const b = await upsertCustomer(db, BIZ, {
      name: "Nome Novo",
      whatsapp: "+55 (85) 9 7777-0001",
    });
    expect(b.id).toBe(a.id);
    expect(b.name).toBe("Nome Novo");
  });

  it("recusa telefone que não é celular", async () => {
    await expect(
      upsertCustomer(db, BIZ, { name: "Fixo", whatsapp: "(85) 3222-1111" }),
    ).rejects.toMatchObject({
      code: "invalid_customer",
    });
  });
});
