import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);
const PHONE = "5585955550001";
const CORTE = "0c000000-0000-4000-8000-000000000001";

async function cleanup() {
  await db.from("appointments").delete().eq("customer_whatsapp", PHONE);
  await db.from("customers").delete().eq("whatsapp", PHONE);
}

let bookAction: typeof import("@/app/(negocio)/[slug]/agendar/actions").bookAction;
let availabilityAction: typeof import("@/app/(negocio)/[slug]/agendar/actions").availabilityAction;

beforeAll(async () => {
  ({ bookAction, availabilityAction } = await import("@/app/(negocio)/[slug]/agendar/actions"));
  await cleanup();
});
afterAll(cleanup);

async function twoFreeSlots(): Promise<string[]> {
  const r = await availabilityAction({ slug: "barbearia-do-ze", serviceId: CORTE, staffId: null });
  if (!r.ok) throw new Error(r.error);
  // último dia da faixa com horário, para não colidir com o seed
  const days = r.data.days.filter((d) => d.status === "open");
  const day = await availabilityAction({
    slug: "barbearia-do-ze",
    serviceId: CORTE,
    staffId: null,
    from: r.data.from,
    date: days.at(-1)!.date,
  });
  if (!day.ok) throw new Error(day.error);
  const all = [
    ...day.data.groups.morning,
    ...day.data.groups.afternoon,
    ...day.data.groups.evening,
  ];
  return [all.at(-1)!.start, all.at(-2)!.start];
}

describe("agendamento público e cadastro automático do cliente (CAL-051)", () => {
  it("cria o cliente no primeiro agendamento e reaproveita no segundo, atualizando o nome", async () => {
    const [a, b] = await twoFreeSlots();
    const first = await bookAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
      start: a,
      name: "Primeiro Nome",
      whatsapp: "(85) 9 5555-0001",
    });
    expect(first.ok).toBe(true);
    const second = await bookAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
      start: b,
      name: "Nome Atualizado",
      whatsapp: "85955550001",
    });
    expect(second.ok).toBe(true);
    const { data: customers } = await db.from("customers").select("id, name").eq("whatsapp", PHONE);
    expect(customers).toHaveLength(1);
    expect(customers![0].name).toBe("Nome Atualizado");
    const { data: appts } = await db
      .from("appointments")
      .select("customer_id, customer_name")
      .eq("customer_whatsapp", PHONE);
    expect(appts).toHaveLength(2);
    expect(new Set(appts!.map((x) => x.customer_id)).size).toBe(1);
    // o agendamento guarda o nome do momento
    expect(appts!.map((x) => x.customer_name).sort()).toEqual(["Nome Atualizado", "Primeiro Nome"]);
  });

  it("recusa robô (campo-isca) e slug inexistente", async () => {
    const [a] = await twoFreeSlots();
    const bot = await bookAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
      start: a,
      name: "Bot",
      whatsapp: "85955550001",
      website: "spam",
    });
    expect(bot.ok).toBe(false);
    const nope = await bookAction({
      slug: "nao-existe",
      serviceId: CORTE,
      staffId: null,
      start: a,
      name: "Alguém",
      whatsapp: "85955550001",
    });
    expect(nope).toMatchObject({ ok: false, code: "business_unavailable" });
  });

  it("horário já ocupado devolve a mensagem amigável", async () => {
    const { data } = await db
      .from("appointments")
      .select("starts_at, staff_member_id")
      .eq("customer_whatsapp", PHONE)
      .limit(1)
      .single();
    const r = await bookAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: data!.staff_member_id,
      start: data!.starts_at,
      name: "Outro",
      whatsapp: "85955550001",
    });
    expect(r).toMatchObject({ ok: false, code: "unavailable" });
    if (!r.ok) expect(r.error).toBe("Esse horário não está mais disponível. Escolha outro.");
  });
});
