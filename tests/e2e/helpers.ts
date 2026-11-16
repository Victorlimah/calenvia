import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

const URL = "http://127.0.0.1:54321";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/** Acesso direto ao Supabase local para preparar e limpar dados dos testes. */
export const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

export const ZE_BIZ = "0b000000-0000-4000-8000-000000000001";

export async function cleanupCustomer(whatsapp: string) {
  await admin.from("messages").delete().eq("to_number", whatsapp);
  await admin.from("appointments").delete().eq("customer_whatsapp", whatsapp);
  await admin.from("customers").delete().eq("whatsapp", whatsapp);
}

export async function flowReady(page: Page) {
  await expect(page.locator("[data-ready]")).toBeAttached();
}

/** Percorre o fluxo público até o passo 4, escolhendo o último horário do último dia livre da faixa. */
export async function goToCustomerStep(
  page: Page,
  service = /Corte masculino/,
  staff = /Sem preferência/,
) {
  await page.goto("/agendar");
  await flowReady(page);
  await page.getByRole("radio", { name: service }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  const staffRadio = page.getByRole("radio", { name: staff });
  if (await staffRadio.count()) await staffRadio.click();
  await page.getByRole("button", { name: "Continuar" }).click();
  const days = page.getByRole("list", { name: "Dias" }).getByRole("button", { disabled: false });
  await expect(days.first()).toBeVisible();
  await days.last().click();
  const slots = page.locator('[aria-label^="Horários da"] button');
  await expect(slots.first()).toBeVisible();
  await slots.last().click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
}

export async function loginAsZe(page: Page, next = "/", email = "ze@calenvia.dev") {
  await page.goto(`http://app.localhost:3000/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("calenvia123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(
    (u) => u.host === "app.localhost:3000" && !u.pathname.startsWith("/entrar"),
  );
}

export const ANA_BIZ = "0b000000-0000-4000-8000-000000000002";

/** Dona da Ana Nails (plano Básico). */
export function loginAsAna(page: Page, next = "/") {
  return loginAsZe(page, next, "ana@calenvia.dev");
}

/** Próximo dia (no fuso da barbearia) com agendamentos do seed. */
export async function seededDay(): Promise<string> {
  const { data } = await admin
    .from("appointments")
    .select("starts_at")
    .eq("business_id", ZE_BIZ)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .single();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(
    new Date(data!.starts_at),
  );
}

/** Cria um agendamento de teste (via banco) num dia livre da barbearia, daqui a ~10 dias. */
export async function createTestAppointment(phone: string, time = "10:00") {
  const tz = "America/Fortaleza";
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const base = new Date(Date.now() + 10 * 86400000);
  // quarta-feira mais próxima (aberta, sem seed)
  while (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(base) !== "Wed"
  ) {
    base.setTime(base.getTime() + 86400000);
  }
  const day = fmt.format(base);
  const start = new Date(`${day}T${time}:00-03:00`);
  const { data: customer } = await admin
    .from("customers")
    .upsert(
      { business_id: ZE_BIZ, whatsapp: phone, name: "Cliente Detalhe" },
      { onConflict: "business_id,whatsapp" },
    )
    .select("id")
    .single();
  const { data, error } = await admin
    .from("appointments")
    .insert({
      business_id: ZE_BIZ,
      customer_id: customer!.id,
      service_id: "0c000000-0000-4000-8000-000000000001",
      staff_member_id: "0d000000-0000-4000-8000-000000000001",
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + 30 * 60000).toISOString(),
      price_cents: 4000,
      customer_name: "Cliente Detalhe",
      customer_whatsapp: phone,
      source: "manual",
    })
    .select("id, manage_code")
    .single();
  if (error) throw error;
  return { id: data!.id, code: data!.manage_code, day };
}

/**
 * Cria (ou recria) um usuário membro da barbearia com o papel dado e devolve o e-mail
 * (senha calenvia123). Profissional fica ligado ao Rafael. Use `removeRoleUser` para limpar.
 */
export async function createRoleUser(role: "manager" | "reception" | "staff") {
  const email = `e2e-${role}@calenvia.dev`;
  await removeRoleUser(role);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "calenvia123",
    email_confirm: true,
  });
  if (error) throw error;
  const { error: memberError } = await admin.from("business_members").insert({
    business_id: ZE_BIZ,
    user_id: data.user.id,
    role,
    email,
    display_name: `Teste ${role}`,
    staff_member_id: role === "staff" ? "0d000000-0000-4000-8000-000000000002" : null,
    status: "active",
  });
  if (memberError) throw memberError;
  return email;
}

export async function removeRoleUser(role: "manager" | "reception" | "staff") {
  const email = `e2e-${role}@calenvia.dev`;
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data?.users.find((u) => u.email === email);
  if (!user) return;
  await admin.from("business_members").delete().eq("user_id", user.id);
  await admin.auth.admin.deleteUser(user.id);
}
