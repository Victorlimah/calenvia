import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Demonstração pública (CAL-086): um negócio de exemplo em demo.{domínio} para o visitante
 * testar o agendamento. Nenhuma mensagem é enviada e tudo é zerado todo dia pelo cron.
 */
export const DEMO_SLUG = "demo";
export const DEMO_EMAIL = "demo@calenvia.com.br";
export const DEMO = {
  business: "de000000-0000-4000-8000-000000000001",
  staff: ["de000000-0000-4000-8000-0000000000a1", "de000000-0000-4000-8000-0000000000a2"],
  services: [
    "de000000-0000-4000-8000-0000000000b1",
    "de000000-0000-4000-8000-0000000000b2",
    "de000000-0000-4000-8000-0000000000b3",
  ],
} as const;

export function isDemoSlug(slug: string | null | undefined): boolean {
  return slug === DEMO_SLUG;
}

type Db = SupabaseClient<Database>;

async function ensureOwner(db: Db): Promise<string> {
  const { data: existing } = await db
    .from("businesses")
    .select("owner_id")
    .eq("id", DEMO.business)
    .maybeSingle();
  if (existing) return existing.owner_id;
  const { data, error } = await db.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: crypto.randomUUID() + crypto.randomUUID(), // ninguém entra no painel da demo
    email_confirm: true,
    user_metadata: { name: "Demonstração" },
  });
  if (data.user) return data.user.id;
  // Já existe (de uma execução anterior que falhou depois): procura pelo e-mail.
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (!found) throw new Error(`Não foi possível criar o dono da demo: ${error?.message}`);
  return found.id;
}

/** Cria (ou recria) a demonstração do zero. Idempotente; usa o client service_role. */
export async function resetDemo(db: Db): Promise<{ removedAppointments: number }> {
  const owner = await ensureOwner(db);
  const { error: bizError } = await db.from("businesses").upsert({
    id: DEMO.business,
    owner_id: owner,
    slug: DEMO_SLUG,
    name: "Studio Exemplo",
    segment: "salao",
    address: "Av. Exemplo, 100 — Centro",
    address_reference: "Negócio fictício para demonstração",
    whatsapp: null,
    timezone: "America/Sao_Paulo",
    accent_color: "#E2725B",
    headline: "Experimente agendar: é assim que seu cliente vai ver.",
    subheadline:
      "Esta é uma demonstração da Calenvia. Escolha um serviço e um horário — nenhuma mensagem é enviada.",
    slot_interval_min: 30,
    min_notice_min: 0,
    max_days_ahead: 30,
    cancel_notice_min: 60,
    plan: "pro",
    plan_status: "active",
    onboarding_completed_at: new Date().toISOString(),
  });
  if (bizError) throw new Error(`demo: negócio: ${bizError.message}`);

  // Zera o que os visitantes fizeram.
  const { data: removed } = await db
    .from("appointments")
    .delete()
    .eq("business_id", DEMO.business)
    .select("id");
  await db.from("messages").delete().eq("business_id", DEMO.business);
  await db.from("customers").delete().eq("business_id", DEMO.business);
  await db.from("time_blocks").delete().eq("business_id", DEMO.business);

  const services = [
    ["Corte feminino", "Lavagem, corte e finalização.", 60, 9000, true],
    ["Escova", "Escova modelada com proteção térmica.", 45, 6000, false],
    ["Manicure", "Cutilagem e esmaltação.", 45, 4000, true],
  ] as const;
  await db.from("services").upsert(
    services.map(([name, description, duration_min, price_cents, is_featured], i) => ({
      id: DEMO.services[i],
      business_id: DEMO.business,
      name,
      description,
      duration_min,
      price_cents,
      is_featured,
      is_active: true,
      sort_order: i + 1,
    })),
  );
  await db.from("staff_members").upsert([
    {
      id: DEMO.staff[0],
      business_id: DEMO.business,
      name: "Carla",
      role: "Cabeleireira",
      is_active: true,
    },
    {
      id: DEMO.staff[1],
      business_id: DEMO.business,
      name: "Bianca",
      role: "Manicure",
      is_active: true,
    },
  ]);
  await db
    .from("staff_services")
    .delete()
    .in("staff_member_id", [...DEMO.staff]);
  await db.from("staff_services").insert([
    { business_id: DEMO.business, staff_member_id: DEMO.staff[0], service_id: DEMO.services[0] },
    { business_id: DEMO.business, staff_member_id: DEMO.staff[0], service_id: DEMO.services[1] },
    { business_id: DEMO.business, staff_member_id: DEMO.staff[1], service_id: DEMO.services[2] },
  ]);
  const { error: hoursError } = await db.rpc("save_business_hours", {
    p_business_id: DEMO.business,
    p_days: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      is_open: weekday !== 0,
      opens_at: weekday === 6 ? "09:00" : "09:00",
      closes_at: weekday === 6 ? "14:00" : "20:00",
      breaks: weekday === 6 ? [] : [{ starts_at: "12:00", ends_at: "13:00" }],
    })) as never,
  });
  if (hoursError) throw new Error(`demo: horários: ${hoursError.message}`);
  return { removedAppointments: removed?.length ?? 0 };
}
