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
