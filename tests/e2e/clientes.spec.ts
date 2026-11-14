import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe } from "./helpers";

const PHONE = "5585944440099";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("lista de clientes: busca, números, detalhe e novo agendamento", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "16:00");
  await admin
    .from("appointments")
    .update({ status: "completed", price_cents: 4000 })
    .eq("id", appt.id);

  await loginAsZe(page, "/clientes");
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await page.getByLabel("Buscar cliente").fill("944440099");
  await page.getByRole("button", { name: "Buscar" }).click();
  const list = page.getByRole("list", { name: "Lista de clientes" });
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(list).toContainText("Cliente Detalhe");
  await expect(list).toContainText("1 visita");
  await expect(list).toContainText("R$ 40,00");

  await list.getByRole("link").click();
  await expect(page.getByRole("heading", { name: "Cliente Detalhe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible();
  await expect(page.getByText("Concluído").first()).toBeVisible();

  // Em dev, a primeira visita compila a rota: repete até a página hidratar.
  await expect(async () => {
    await page.getByLabel("Nome do cliente").fill("");
    await page.getByLabel("Nome do cliente").fill("Cliente Renomeado");
    await expect(page.getByRole("button", { name: "Salvar nome" })).toBeEnabled({ timeout: 1000 });
  }).toPass();
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(page.getByText("Nome salvo.")).toBeVisible();

  await page.getByRole("link", { name: "Novo agendamento" }).click();
  await expect(page).toHaveURL(/\/novo\?cliente=/);
  await expect(page.getByText("Cliente Renomeado")).toBeVisible();
});

test("busca sem resultado mostra estado vazio", async ({ page }) => {
  await loginAsZe(page, "/clientes?q=zzzzzzzz");
  await expect(page.getByText("Nenhum cliente encontrado")).toBeVisible();
});
