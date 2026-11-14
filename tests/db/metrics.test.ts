import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const ZE = "0b000000-0000-4000-8000-000000000001";
const ANA = "0b000000-0000-4000-8000-000000000002";
const FROM = "2034-06-01T00:00:00Z";
const TO = "2034-07-01T00:00:00Z";

let track: typeof import("@/lib/metrics").track;

async function cleanup() {
  await db.from("product_events").delete().gte("created_at", FROM).lt("created_at", TO);
}

beforeAll(async () => {
  ({ track } = await import("@/lib/metrics"));
  await cleanup();
  // Eventos "uma vez por negócio" de outros testes colidiriam com os do funil de teste.
  await db.from("product_events").delete().in("business_id", [ZE, ANA]);
  const at = (d: number) => new Date(Date.parse(FROM) + d * 3600_000).toISOString();
  const { error } = await db.from("product_events").insert([
    { name: "site_visit", created_at: at(1) },
    { name: "site_visit", created_at: at(2) },
    { name: "site_visit", created_at: at(3) },
    { name: "signup", created_at: at(4) },
    { name: "signup", created_at: at(5) },
    { name: "business_created", business_id: ZE, created_at: at(6) },
    { name: "business_created", business_id: ANA, created_at: at(6) },
    { name: "first_appointment", business_id: ZE, created_at: at(7) },
  ]);
  if (error) throw error;
});
afterAll(cleanup);

describe("métricas de uso (CAL-085)", () => {
  it("funil do período na ordem das etapas", async () => {
    const { data, error } = await db.rpc("metrics_funnel", { p_from: FROM, p_to: TO });
    expect(error).toBeNull();
    expect(data).toEqual([
      { step: "site_visit", total: 3 },
      { step: "signup", total: 2 },
      { step: "business_created", total: 2 },
      { step: "first_service", total: 0 },
      { step: "onboarding_completed", total: 0 },
      { step: "first_appointment", total: 1 },
      { step: "subscription_started", total: 0 },
    ]);
  });

  it("'primeiro X' só registra uma vez por negócio, sem erro", async () => {
    const before = await db
      .from("product_events")
      .select("id", { count: "exact", head: true })
      .eq("name", "first_service")
      .eq("business_id", ANA);
    await track("first_service", { businessId: ANA });
    await track("first_service", { businessId: ANA });
    const after = await db
      .from("product_events")
      .select("id", { count: "exact", head: true })
      .eq("name", "first_service")
      .eq("business_id", ANA);
    expect(after.count).toBe(Math.max(1, before.count ?? 0));
  });

  it("visitante não lê eventos nem o funil", async () => {
    const anon = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON, {
      auth: { persistSession: false },
    });
    const r = await anon.from("product_events").select("id").limit(1);
    expect(r.error ?? r.data).toBeTruthy();
    expect(r.data ?? []).toEqual([]);
    const f = await anon.rpc("metrics_funnel", { p_from: FROM, p_to: TO });
    expect(f.error).not.toBeNull();
  });
});
