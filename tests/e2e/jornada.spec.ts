import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, goToCustomerStep, loginAsZe } from "./helpers";

/**
 * Jornada completa (CAL-088): o cliente agenda pela página, recebe a confirmação (mock),
 * o dono vê na agenda, o cliente cancela pelo link e a agenda libera o horário.
 */
const PHONE = "5585966660077";
const ZE = "http://barbearia-do-ze.localhost:3000";
test.use({ baseURL: ZE });
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("cliente agenda, dono vê, cliente cancela pelo link", async ({ page, browser }) => {
  // 1) Cliente agenda pela página pública
  await page.goto(`${ZE}/`);
  await page.getByRole("link", { name: "Agendar meu horário" }).first().click();
  await goToCustomerStep(page);
  await page.getByLabel("Seu nome").fill("Jornada Teste");
  await page.getByLabel("Seu WhatsApp").fill("85966660077");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
  await expect(page.getByText(/Enviamos a confirmação para o seu WhatsApp/)).toBeVisible();

  const { data: appt } = await admin
    .from("appointments")
    .select("id, starts_at, manage_code, messages(type, status)")
    .eq("customer_whatsapp", PHONE)
    .single();
  expect(appt!.messages).toEqual([{ type: "confirmation", status: "sent" }]);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(
    new Date(appt!.starts_at),
  );

  // 2) Dono vê na agenda do dia
  const owner = await browser.newPage();
  await loginAsZe(owner, `/?data=${day}`);
  await expect(owner.getByRole("link", { name: /Jornada Teste/ })).toBeVisible();

  // 3) Cliente cancela pelo link da mensagem
  await page.goto(`${ZE}/gerenciar/${appt!.manage_code}`);
  await page.getByRole("button", { name: "Cancelar agendamento" }).click();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();

  // 4) A agenda do dono atualiza sozinha (tempo real) e o aviso de cancelamento saiu
  await expect(owner.getByRole("link", { name: /Jornada Teste/ })).toHaveCount(0, {
    timeout: 10_000,
  });
  const { data: msgs } = await admin
    .from("messages")
    .select("type")
    .eq("appointment_id", appt!.id)
    .order("created_at");
  expect(msgs!.map((m) => m.type)).toEqual(["confirmation", "cancellation"]);
  await owner.close();
});
