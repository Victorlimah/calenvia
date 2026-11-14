import { expect, test } from "./fixtures";
import {
  admin,
  cleanupCustomer,
  createTestAppointment,
  goToCustomerStep,
  loginAsZe,
} from "./helpers";

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

test("LGPD: dono exporta e apaga os dados de um cliente", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "17:30");
  const { data: c } = await admin.from("customers").select("id").eq("whatsapp", PHONE).single();
  await loginAsZe(page, `/clientes/${c!.id}`);

  const res = await page.request.get(`/clientes/${c!.id}/dados`);
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.cliente.whatsapp).toBe(PHONE);
  expect(json.agendamentos).toHaveLength(1);

  await page.getByRole("button", { name: "Apagar dados do cliente" }).click();
  await page.getByRole("button", { name: "Sim, apagar dados" }).click();
  await expect(page).toHaveURL(/\/clientes$/);
  const { data: after } = await admin
    .from("appointments")
    .select("customer_name, customer_whatsapp, status")
    .eq("id", appt.id)
    .single();
  expect(after).toMatchObject({ customer_name: "Cliente removido", status: "canceled" });
  expect(after!.customer_whatsapp).not.toBe(PHONE);
  // limpeza: o cliente anonimizado não tem mais o PHONE
  await admin.from("appointments").delete().eq("id", appt.id);
  await admin.from("customers").delete().eq("id", c!.id);
});

test.describe("agendamento", () => {
  test.use({ baseURL: "http://barbearia-do-ze.localhost:3000" });
  test("aviso de privacidade aparece antes de confirmar", async ({ page }) => {
    await goToCustomerStep(page);
    await expect(page.getByText(/usa seu nome e WhatsApp só para este atendimento/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute(
      "href",
      "http://localhost:3000/privacidade",
    );
  });
});
