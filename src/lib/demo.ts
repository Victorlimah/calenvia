import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { themeFromTemplate } from "@/lib/themes/apply";
import {
  ALEGRE_META,
  CLINICO_META,
  DELICADO_META,
  NATUREZA_META,
  NOTURNO_META,
  type TemplateMeta,
} from "@/lib/themes/template-meta";

/**
 * Demonstração pública (CAL-086): negócios de exemplo em demo*.{domínio} para o visitante
 * testar o agendamento. Nenhuma mensagem é enviada e tudo é zerado todo dia pelo cron.
 * CAL-152: um negócio por segmento, cada um num template diferente.
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

type DemoService = readonly [string, string, number, number, boolean];

export type DemoBusiness = {
  slug: string;
  ids: {
    business: string;
    staff: readonly [string, string];
    services: readonly [string, string, string];
  };
  name: string;
  segment: string;
  template: TemplateMeta;
  headline: string;
  services: readonly [DemoService, DemoService, DemoService];
  staff: readonly [readonly [string, string], readonly [string, string]];
  /** Quem faz cada serviço (índice do profissional). */
  serviceStaff: readonly [number, number, number];
};

function ids(n: number): DemoBusiness["ids"] {
  const h = n.toString(16).padStart(2, "0");
  return {
    business: `de0000${h}-0000-4000-8000-000000000001`,
    staff: [`de0000${h}-0000-4000-8000-0000000000a1`, `de0000${h}-0000-4000-8000-0000000000a2`],
    services: [
      `de0000${h}-0000-4000-8000-0000000000b1`,
      `de0000${h}-0000-4000-8000-0000000000b2`,
      `de0000${h}-0000-4000-8000-0000000000b3`,
    ],
  };
}

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    slug: DEMO_SLUG,
    ids: DEMO,
    name: "Studio Exemplo",
    segment: "salao",
    template: DELICADO_META,
    headline: "Experimente agendar: é assim que seu cliente vai ver.",
    services: [
      ["Corte feminino", "Lavagem, corte e finalização.", 60, 9000, true],
      ["Escova", "Escova modelada com proteção térmica.", 45, 6000, false],
      ["Manicure", "Cutilagem e esmaltação.", 45, 4000, true],
    ],
    staff: [
      ["Carla", "Cabeleireira"],
      ["Bianca", "Manicure"],
    ],
    serviceStaff: [0, 0, 1],
  },
  {
    slug: "demo-barbearia",
    ids: ids(2),
    name: "Barbearia Exemplo",
    segment: "barbearia",
    template: NOTURNO_META,
    headline: "Seu corte no horário certo, sem fila.",
    services: [
      ["Corte", "Tesoura ou máquina, com acabamento.", 30, 4500, true],
      ["Barba", "Toalha quente e navalha.", 30, 3500, false],
      ["Corte e barba", "O combo completo.", 60, 7000, true],
    ],
    staff: [
      ["Rafael", "Barbeiro"],
      ["Joana", "Barbeira"],
    ],
    serviceStaff: [0, 1, 0],
  },
  {
    slug: "demo-clinica",
    ids: ids(3),
    name: "Clínica Exemplo",
    segment: "fisioterapia",
    template: CLINICO_META,
    headline: "Agende sua consulta em menos de um minuto.",
    services: [
      ["Avaliação", "Primeira consulta, com plano de tratamento.", 60, 15000, true],
      ["Sessão de fisioterapia", "Atendimento individual.", 50, 12000, false],
      ["Pilates clínico", "Aula individual com fisioterapeuta.", 50, 11000, false],
    ],
    staff: [
      ["Dra. Marina", "Fisioterapeuta"],
      ["Dr. Paulo", "Fisioterapeuta"],
    ],
    serviceStaff: [0, 1, 0],
  },
  {
    slug: "demo-pet",
    ids: ids(4),
    name: "Pet Exemplo",
    segment: "pet",
    template: ALEGRE_META,
    headline: "Banho e tosa sem fila: escolha o horário do seu pet.",
    services: [
      ["Banho", "Para cães de pequeno e médio porte.", 60, 6000, true],
      ["Banho e tosa", "Com tosa higiênica ou na tesoura.", 90, 9000, true],
      ["Hidratação", "Pelos macios e cheirosos.", 30, 3500, false],
    ],
    staff: [
      ["Lu", "Banho e tosa"],
      ["Téo", "Banho e tosa"],
    ],
    serviceStaff: [0, 1, 0],
  },
  {
    slug: "demo-pilates",
    ids: ids(5),
    name: "Pilates Exemplo",
    segment: "pilates",
    template: NATUREZA_META,
    headline: "Respire, alongue e marque sua aula.",
    services: [
      ["Aula de pilates", "Turma de até 3 pessoas.", 50, 8000, true],
      ["Aula experimental", "Para conhecer o studio.", 50, 0, false],
      ["Aula particular", "Só você e a instrutora.", 50, 13000, false],
    ],
    staff: [
      ["Helena", "Instrutora"],
      ["Igor", "Instrutor"],
    ],
    serviceStaff: [0, 0, 1],
  },
];

export const DEMO_SLUGS = DEMO_BUSINESSES.map((d) => d.slug);

export function isDemoSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && DEMO_SLUGS.includes(slug));
}

type Db = SupabaseClient<Database>;

async function ensureOwner(db: Db): Promise<string> {
  const { data: existing } = await db
    .from("businesses")
    .select("owner_id")
    .eq("id", DEMO.business)
    .maybeSingle();
  if (existing?.owner_id) return existing.owner_id;
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

/** Cria (ou recria) as demonstrações do zero. Idempotente; usa o client service_role. */
export async function resetDemo(db: Db): Promise<{ removedAppointments: number }> {
  const owner = await ensureOwner(db);
  let removedAppointments = 0;
  for (const demo of DEMO_BUSINESSES) removedAppointments += await resetOne(db, owner, demo);
  return { removedAppointments };
}

async function resetOne(db: Db, owner: string, d: DemoBusiness): Promise<number> {
  const B = d.ids.business;
  const { error: bizError } = await db.from("businesses").upsert({
    id: B,
    owner_id: owner,
    slug: d.slug,
    name: d.name,
    segment: d.segment,
    address: "Av. Exemplo, 100 — Centro",
    address_reference: "Negócio fictício para demonstração",
    whatsapp: null,
    timezone: "America/Sao_Paulo",
    headline: d.headline,
    subheadline:
      "Esta é uma demonstração da Calenvia. Escolha um serviço e um horário — nenhuma mensagem é enviada.",
    theme: themeFromTemplate(d.template, { accent: "#E2725B" }),
    accent_color: "#E2725B",
    slot_interval_min: 30,
    min_notice_min: 0,
    max_days_ahead: 30,
    cancel_notice_min: 60,
    plan: "pro",
    plan_status: "active",
    onboarding_completed_at: new Date().toISOString(),
  });
  if (bizError) throw new Error(`demo ${d.slug}: negócio: ${bizError.message}`);

  // Zera o que os visitantes fizeram.
  const { data: removed } = await db
    .from("appointments")
    .delete()
    .eq("business_id", B)
    .select("id");
  await db.from("messages").delete().eq("business_id", B);
  await db.from("customers").delete().eq("business_id", B);
  await db.from("time_blocks").delete().eq("business_id", B);

  await db.from("services").upsert(
    d.services.map(([name, description, duration_min, price_cents, is_featured], i) => ({
      id: d.ids.services[i],
      business_id: B,
      name,
      description,
      duration_min,
      price_cents,
      is_featured,
      is_active: true,
      sort_order: i + 1,
    })),
  );
  await db.from("staff_members").upsert(
    d.staff.map(([name, role], i) => ({
      id: d.ids.staff[i],
      business_id: B,
      name,
      role,
      is_active: true,
    })),
  );
  await db
    .from("staff_services")
    .delete()
    .in("staff_member_id", [...d.ids.staff]);
  await db.from("staff_services").insert(
    d.serviceStaff.map((staffIndex, i) => ({
      business_id: B,
      staff_member_id: d.ids.staff[staffIndex],
      service_id: d.ids.services[i],
    })),
  );
  const { error: hoursError } = await db.rpc("save_business_hours", {
    p_business_id: B,
    p_days: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      is_open: weekday !== 0,
      opens_at: "09:00",
      closes_at: weekday === 6 ? "14:00" : "20:00",
      breaks: weekday === 6 ? [] : [{ starts_at: "12:00", ends_at: "13:00" }],
    })) as never,
  });
  if (hoursError) throw new Error(`demo ${d.slug}: horários: ${hoursError.message}`);
  return removed?.length ?? 0;
}
