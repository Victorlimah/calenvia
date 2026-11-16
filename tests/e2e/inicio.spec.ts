import { expect, test } from "./fixtures";
import {
  admin,
  cleanupCustomer,
  createRoleUser,
  loginAsZe,
  removeRoleUser,
  ZE_BIZ,
} from "./helpers";

// CAL-123/124/125: Início com métricas, clientes sumidos e ranking.
const PHONE = "5585944440123";

async function seedReturningCustomer() {
  await cleanupCustomer(PHONE);
  const { data: c } = await admin
    .from("customers")
    .insert({ business_id: ZE_BIZ, whatsapp: PHONE, name: "Sumido Teste" })
    .select("id")
    .single();
  // Visitas a cada 10 dias, a última há 40 dias: passou do tempo médio dele.
  const rows = [70, 60, 50, 40].map((daysAgo, i) => {
    const start = new Date(Date.now() - daysAgo * 86400000);
    start.setUTCHours(13, 0, 0, 0);
    return {
      business_id: ZE_BIZ,
      customer_id: c!.id,
      service_id: "0c000000-0000-4000-8000-000000000001",
      staff_member_id: "0d000000-0000-4000-8000-000000000001",
      starts_at: new Date(start.getTime() + i * 60000).toISOString(),
      ends_at: new Date(start.getTime() + 30 * 60000 + i * 60000).toISOString(),
      status: "completed",
      price_cents: 9000,
      customer_name: "Sumido Teste",
      customer_whatsapp: PHONE,
      source: "manual",
    };
  });
  const { error } = await admin.from("appointments").insert(rows);
  if (error) throw error;
}

test.beforeAll(seedReturningCustomer);
test.afterAll(async () => {
  await cleanupCustomer(PHONE);
  await removeRoleUser("staff");
});

test("dono vê faturamento, gráficos e retorno dos clientes", async ({ page }) => {
  await loginAsZe(page, "/");
  await expect(page.getByRole("heading", { name: "Faturamento" })).toBeVisible();
  await expect(page.getByText("Este mês", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Faturamento nos últimos 30 dias").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retorno dos clientes" })).toBeVisible();
  await expect(page.getByText("Tempo médio entre visitas")).toBeVisible();
  // tabela alternativa do gráfico
  await page.getByText("Ver em tabela").first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("profissional vê só os próprios números, sem valores", async ({ page }) => {
  const email = await createRoleUser("staff");
  await loginAsZe(page, "/", email);
  await expect(page.getByRole("heading", { name: "Hoje" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faturamento" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("R$");
});

test("clientes sumidos com botão de WhatsApp e ranking", async ({ page }) => {
  await loginAsZe(page, "/clientes?filtro=sumidos");
  const list = page.getByRole("list", { name: "Clientes sumidos" });
  const row = list.getByRole("listitem").filter({ hasText: "Sumido Teste" });
  await expect(row).toContainText("costuma voltar a cada 10 dias");
  await expect(row.getByRole("link", { name: "Chamar no WhatsApp" })).toHaveAttribute(
    "href",
    new RegExp(`wa\\.me/${PHONE}\\?text=`),
  );
  await page
    .getByRole("navigation", { name: "Ver clientes" })
    .getByRole("link", { name: "Ranking" })
    .click();
  await page.getByRole("link", { name: "Sempre" }).click();
  await page.getByRole("link", { name: "Que mais gastam" }).click();
  const ranking = page.getByRole("list", { name: "Clientes que mais gastam" });
  await expect(ranking.getByRole("link", { name: /Sumido Teste/ })).toContainText("R$ 360,00");
  await ranking.getByRole("link", { name: /Sumido Teste/ }).click();
  await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);
});
