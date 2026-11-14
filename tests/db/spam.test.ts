import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { fakeRequest } from "./next-headers-mock";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const PHONE = "5585955550777";
const CORTE = "0c000000-0000-4000-8000-000000000001";

let rl: typeof import("@/lib/rate-limit");
let actions: typeof import("@/app/(negocio)/[slug]/agendar/actions");
let captcha: typeof import("@/lib/captcha");

async function cleanup() {
  await db.from("appointments").delete().eq("customer_whatsapp", PHONE);
  await db.from("customers").delete().eq("whatsapp", PHONE);
  await db.from("rate_limits").delete().like("key", "%");
}

beforeAll(async () => {
  rl = await import("@/lib/rate-limit");
  actions = await import("@/app/(negocio)/[slug]/agendar/actions");
  captcha = await import("@/lib/captcha");
  await cleanup();
});
afterEach(() => {
  fakeRequest.ip = "127.0.0.1";
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
});
afterAll(cleanup);

describe("limite por IP (CAL-089)", () => {
  it("bloqueia depois do limite na janela e não afeta outro IP", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 11; i++) results.push(await rl.checkRateLimit("manage", "203.0.113.7"));
    expect(results.slice(0, 10).every(Boolean)).toBe(true);
    expect(results[10]).toBe(false);
    expect(await rl.checkRateLimit("manage", "203.0.113.8")).toBe(true);
  });

  it("guarda só o hash do IP", async () => {
    const { data } = await db.from("rate_limits").select("key");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.some((r) => r.key.includes("203.0.113"))).toBe(false);
  });

  it("chamadas locais não são limitadas em desenvolvimento", async () => {
    for (let i = 0; i < 12; i++) expect(await rl.checkRateLimit("manage", "127.0.0.1")).toBe(true);
  });

  it("visitante não chama a função de limite", async () => {
    const anon = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON);
    const { error } = await anon.rpc("hit_rate_limit", {
      p_key: "x",
      p_limit: 1,
      p_window_seconds: 60,
    });
    expect(error).not.toBeNull();
  });
});

describe("agendamento público: limites anti-spam", () => {
  async function slots(n: number) {
    const r = await actions.availabilityAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
    });
    if (!r.ok) throw new Error(r.error);
    const open = r.data.days.filter((d) => d.status === "open").at(-2)!;
    const day = await actions.availabilityAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
      from: r.data.from,
      date: open.date,
    });
    if (!day.ok) throw new Error(day.error);
    const all = [
      ...day.data.groups.morning,
      ...day.data.groups.afternoon,
      ...day.data.groups.evening,
    ];
    return all.slice(-n).map((s) => s.start);
  }

  it(`no máximo 3 horários futuros por WhatsApp pelo link`, async () => {
    const starts = await slots(4);
    const book = (start: string) =>
      actions.bookAction({
        slug: "barbearia-do-ze",
        serviceId: CORTE,
        staffId: null,
        start,
        name: "Spam Teste",
        whatsapp: "(85) 9 5555-0777",
      });
    for (const s of starts.slice(0, 3)) expect((await book(s)).ok).toBe(true);
    const fourth = await book(starts[3]);
    expect(fourth).toMatchObject({ ok: false, error: expect.stringContaining("3 horários") });
  });

  it("IP que passou do limite de agendamentos recebe aviso", async () => {
    fakeRequest.ip = "198.51.100.23";
    for (let i = 0; i < 5; i++) await rl.checkRateLimit("book", "198.51.100.23");
    const r = await actions.bookAction({
      slug: "barbearia-do-ze",
      serviceId: CORTE,
      staffId: null,
      start: new Date(Date.now() + 86400000).toISOString(),
      name: "Spam Teste",
      whatsapp: "85955550777",
    });
    expect(r).toMatchObject({ ok: false, error: rl.RATE_LIMIT_MESSAGE });
  });
});

describe("captcha opcional", () => {
  it("desligado: sempre passa", async () => {
    expect(await captcha.verifyCaptcha(null, "1.1.1.1")).toBe(true);
  });

  it("ligado: exige token e confere na Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = "s";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "k";
    expect(await captcha.verifyCaptcha(null, "1.1.1.1")).toBe(false);
    const ok = vi.fn(async () => new Response(JSON.stringify({ success: true })));
    const no = vi.fn(async () => new Response(JSON.stringify({ success: false })));
    expect(await captcha.verifyCaptcha("tok", "1.1.1.1", ok)).toBe(true);
    expect(await captcha.verifyCaptcha("tok", "1.1.1.1", no)).toBe(false);
  });
});
