import { expect, test } from "./fixtures";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

// CAL-114: administração da Calenvia (só quem está em platform_admins).
async function reset() {
  await admin
    .from("businesses")
    .update({ member_limit_override: null, message_limit_override: null })
    .eq("id", ZE_BIZ);
  await admin.from("admin_business_notes").delete().eq("business_id", ZE_BIZ);
  await admin.from("admin_audit_log").delete().eq("business_id", ZE_BIZ);
}

test.beforeAll(reset);
test.afterAll(reset);

test("admin muda o limite de um negócio e a mudança vai para o histórico", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsZe(page, "/", "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname === "/admin");
  await expect(page.getByRole("heading", { name: "Negócios" })).toBeVisible();

  await page.getByLabel("Buscar").fill("barbearia");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await page.getByRole("link", { name: /Barbearia do Zé/ }).click();
  await expect(page.getByRole("heading", { name: "Barbearia do Zé" })).toBeVisible();

  await page.getByLabel("Limite de pessoas com acesso").fill("4");
  await page.getByLabel("Mensagens automáticas por mês").fill("400");
  await page.getByLabel("Observação interna").fill("Paga R$ 10 por fora pelo 4º acesso");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Alterações salvas.")).toBeVisible();

  const history = page.getByRole("region", { name: "Histórico da administração" });
  await expect(history.getByText("Limite de pessoas: padrão do plano → 4")).toBeVisible();
  await expect(history.getByText("Cota de mensagens: padrão do plano → 400")).toBeVisible();

  const { data } = await admin
    .from("businesses")
    .select("member_limit_override, message_limit_override")
    .eq("id", ZE_BIZ)
    .single();
  expect(data).toEqual({ member_limit_override: 4, message_limit_override: 400 });
});

test("dono de negócio não vê a administração (404)", async ({ page }) => {
  await loginAsZe(page, "/");
  const res = await page.goto("http://app.localhost:3000/admin");
  expect(res?.status()).toBe(404);
});

test("admin abre as métricas e vê o funil", async ({ page }) => {
  test.setTimeout(120_000);
  await loginAsZe(page, "/admin/metricas", "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname === "/admin/metricas");
  await expect(page.getByRole("heading", { name: "Métricas" })).toBeVisible();
  await expect(page.getByText("Receita mensal estimada")).toBeVisible();
  const funnel = page.getByRole("list", { name: "Funil dos últimos 30 dias" });
  await expect(funnel.getByText("Visitas ao site")).toBeVisible();
  await page.getByRole("link", { name: "7 dias" }).click();
  await expect(page.getByRole("list", { name: "Funil dos últimos 7 dias" })).toBeVisible();
});
