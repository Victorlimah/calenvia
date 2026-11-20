import { expect, test } from "./fixtures";
import { axeViolations, describeViolations } from "./a11y";
import { cleanupCustomer, createTestAppointment, goToCustomerStep, loginAsZe } from "./helpers";

const ZE = "http://barbearia-do-ze.localhost:3000";
const PHONE = "5585944440066";

async function check(page: import("@playwright/test").Page, name: string) {
  const v = await axeViolations(page);
  expect.soft(v, `${name}\n${describeViolations(v)}`).toEqual([]);
}

test.afterAll(() => cleanupCustomer(PHONE));

test("site, termos e privacidade sem violações WCAG AA", async ({ page }) => {
  // Confere o estado final: sem a animação de entrada nem a troca de cores do celular de
  // exemplo (decorativo), que no meio da transição mistura as cores e engana o axe.
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const url of [
    "http://localhost:3000",
    "http://localhost:3000/termos",
    "http://localhost:3000/privacidade",
  ]) {
    await page.goto(url);
    await check(page, url);
  }
});

test.describe("negócio", () => {
  test.use({ baseURL: ZE });
  test("página pública, fluxo de agendamento e gerenciar sem violações", async ({ page }) => {
    await page.goto(ZE);
    await check(page, "página do negócio");
    await page.goto(`${ZE}/agendar`);
    await check(page, "agendar passo 1");
    await goToCustomerStep(page);
    await check(page, "agendar passo 4");
    const appt = await createTestAppointment(PHONE, "17:00");
    await page.goto(`${ZE}/confirmado/${appt.code}`);
    await check(page, "confirmado");
    await page.goto(`${ZE}/gerenciar/${appt.code}`);
    await check(page, "gerenciar");
  });
});

test("painel sem violações", async ({ page }) => {
  await loginAsZe(page, "/");
  await check(page, "início");
  for (const path of [
    "/agenda",
    "/clientes",
    "/negocio",
    "/negocio/equipe",
    "/ajustes",
    "/negocio/servicos",
    "/negocio/horarios",
    "/novo",
    "/registrar",
    "/bloquear",
    "/assinatura",
  ]) {
    await page.goto(path);
    await check(page, path);
  }
});

test("login sem violações", async ({ page }) => {
  await page.goto("/entrar");
  await check(page, "entrar");
  await page.goto("/cadastro");
  await check(page, "cadastro");
});
