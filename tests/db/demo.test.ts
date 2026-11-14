import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
process.env.NEXT_PUBLIC_ROOT_DOMAIN ??= "localhost:3000";

vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}));

const db = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

let demo: typeof import("@/lib/demo");
let actions: typeof import("@/app/(negocio)/[slug]/agendar/actions");

beforeAll(async () => {
  demo = await import("@/lib/demo");
  actions = await import("@/app/(negocio)/[slug]/agendar/actions");
});

describe("demonstração pública (CAL-086)", () => {
  it("cria o negócio de exemplo completo e é idempotente", async () => {
    await demo.resetDemo(db);
    await demo.resetDemo(db);
    const { data: b } = await db
      .from("businesses")
      .select("slug, plan, plan_status, onboarding_completed_at")
      .eq("id", demo.DEMO.business)
      .single();
    expect(b).toMatchObject({ slug: "demo", plan: "pro", plan_status: "active" });
    const { count: services } = await db
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", demo.DEMO.business);
    expect(services).toBe(3);
  });

  it("visitante agenda, nenhuma mensagem sai e o reset apaga o agendamento", async () => {
    const r = await actions.availabilityAction({
      slug: "demo",
      serviceId: demo.DEMO.services[2],
      staffId: null,
    });
    if (!r.ok) throw new Error(r.error);
    const slot = [
      ...r.data.groups.morning,
      ...r.data.groups.afternoon,
      ...r.data.groups.evening,
    ][0];
    const booked = await actions.bookAction({
      slug: "demo",
      serviceId: demo.DEMO.services[2],
      staffId: null,
      start: slot.start,
      name: "Visitante",
      whatsapp: "85988880001",
    });
    expect(booked.ok).toBe(true);
    const { count: msgs } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("business_id", demo.DEMO.business);
    expect(msgs).toBe(0);

    const { removedAppointments } = await demo.resetDemo(db);
    expect(removedAppointments).toBe(1);
    const { count: customers } = await db
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", demo.DEMO.business);
    expect(customers).toBe(0);
  });

  it("'demo' não pode ser escolhido por outro negócio", async () => {
    const { validateSlug } = await import("@/lib/slug");
    expect(validateSlug("demo")).toMatch(/reservado/);
  });
});
