import { expect, test } from "./fixtures";
import { cleanupCustomer, loginAsZe } from "./helpers";

const PHONE = "5585933330001";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

function wednesdayIn(days: number) {
  const tz = "America/Fortaleza";
  const d = new Date(Date.now() + days * 86400000);
  while (new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d) !== "Wed")
    d.setTime(d.getTime() + 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

test("novo agendamento manual com cliente novo e depois com cliente existente", async ({
  page,
}) => {
  const day = wednesdayIn(12);
  await loginAsZe(page, `/novo?data=${day}&hora=16:00`);
  await page.getByLabel("Serviço").selectOption({ label: "Pezinho · 15 min · R$ 15,00" });
  const slots = page.getByRole("list", { name: "Horários livres" }).getByRole("button");
  await expect(slots.first()).toBeVisible();
  await slots.filter({ hasText: "16:00" }).click();
  await page.getByLabel("Nome do cliente").fill("Manual Teste");
  await page.getByLabel("WhatsApp do cliente").fill("85933330001");
  await page.getByLabel("Observações (opcional)").fill("Cliente prefere máquina 2");
  await page.getByRole("button", { name: "Agendar", exact: true }).click();
  await expect(page).toHaveURL(/\/agendamento\/.+\?enviar=1/);
  await expect(page.getByRole("heading", { name: "Manual Teste" })).toBeVisible();
  await expect(page.getByText("Cliente prefere máquina 2")).toBeVisible();
  await expect(page.getByText("Agendamento criado")).toBeVisible();

  // cliente existente pela busca
  await page.goto(`/novo?data=${day}`);
  await page.getByLabel("Buscar cliente").fill("Manual");
  await page
    .getByRole("list", { name: "Clientes encontrados" })
    .getByRole("button", { name: /Manual Teste/ })
    .click();
  await page.getByRole("list", { name: "Horários livres" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Agendar", exact: true }).click();
  await expect(page).toHaveURL(/\/agendamento\//);
  await expect(page.getByRole("heading", { name: "Manual Teste" })).toBeVisible();
});

test("só mostra horários livres (o já marcado some)", async ({ page }) => {
  const day = wednesdayIn(12);
  await loginAsZe(page, `/novo?data=${day}&profissional=0d000000-0000-4000-8000-000000000001`);
  await page.getByLabel("Serviço").selectOption({ label: "Corte masculino · 30 min · R$ 40,00" });
  const slots = page.getByRole("list", { name: "Horários livres" }).getByRole("button");
  await slots.filter({ hasText: "09:00" }).click();
  await page.getByLabel("Nome do cliente").fill("Manual Teste");
  await page.getByLabel("WhatsApp do cliente").fill("85933330001");
  await page.getByRole("button", { name: "Agendar", exact: true }).click();
  await expect(page).toHaveURL(/\/agendamento\//);
  await page.goto(`/novo?data=${day}&profissional=0d000000-0000-4000-8000-000000000001`);
  await page.getByLabel("Serviço").selectOption({ label: "Corte masculino · 30 min · R$ 40,00" });
  await expect(slots.first()).toBeVisible();
  await expect(slots.filter({ hasText: "09:00" })).toHaveCount(0);
});
