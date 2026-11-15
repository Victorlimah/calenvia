import { expect, test } from "./fixtures";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

// CAL-114: administração da Calenvia (só quem está em platform_admins).
const E2E_ERROR = "E2E: número sem WhatsApp (131026)";
async function reset() {
  await admin
    .from("businesses")
    .update({ member_limit_override: null, message_limit_override: null })
    .eq("id", ZE_BIZ);
  await admin.from("admin_business_notes").delete().eq("business_id", ZE_BIZ);
  await admin.from("admin_audit_log").delete().eq("business_id", ZE_BIZ);
  await admin.from("support_requests").delete().eq("business_id", ZE_BIZ);
  await admin.from("messages").delete().eq("business_id", ZE_BIZ).eq("error", E2E_ERROR);
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

test("admin responde um pedido de suporte e o dono vê a resposta", async ({ page, browser }) => {
  test.setTimeout(120_000);
  const { data: req } = await admin
    .from("support_requests")
    .insert({
      business_id: ZE_BIZ,
      topic: "agenda",
      message: "Pedido de teste E2E da administração",
    })
    .select("id")
    .single();
  expect(req).toBeTruthy();

  await loginAsZe(page, "/admin/suporte", "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname === "/admin/suporte");
  await expect(page.getByRole("link", { name: /Suporte.*pedidos? abertos?/ })).toBeVisible();
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "Pedido de teste E2E da administração" });
  await card.getByLabel("Resposta").fill("Já ajustamos sua agenda. Qualquer coisa, chame!");
  await card.getByLabel("Status").selectOption("answered");
  await card.getByRole("button", { name: "Salvar pedido" }).click();
  await expect(card.getByText("Pedido atualizado.")).toBeVisible();

  const { data } = await admin
    .from("support_requests")
    .select("status, admin_reply, answered_at")
    .eq("id", req!.id)
    .single();
  expect(data?.status).toBe("answered");
  expect(data?.answered_at).toBeTruthy();

  await page.goto(`/admin/negocios/${ZE_BIZ}`);
  const history = page.getByRole("region", { name: "Histórico da administração" });
  await expect(history.getByText("Pedido de suporte: Aberto → Respondido")).toBeVisible();

  const ze = await browser.newPage();
  await loginAsZe(ze, "/ajuda");
  await expect(ze.getByText("Resposta da Calenvia")).toBeVisible();
  await expect(ze.getByText("Já ajustamos sua agenda.", { exact: false })).toBeVisible();
  await ze.close();
});

test("admin vê as mensagens com falha com o número mascarado", async ({ page }) => {
  test.setTimeout(120_000);
  await admin.from("messages").insert({
    business_id: ZE_BIZ,
    type: "reminder",
    to_number: "5585999997777",
    template: "lembrete",
    status: "failed",
    error: E2E_ERROR,
  });
  await loginAsZe(page, `/admin/negocios/${ZE_BIZ}`, "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname.startsWith("/admin/negocios"));
  await page.getByRole("link", { name: "Ver mensagens com falha" }).click();
  await expect(page.getByRole("heading", { name: "Mensagens com falha" })).toBeVisible();
  const list = page.getByRole("list", { name: "Mensagens" });
  await expect(list.getByText(E2E_ERROR)).toBeVisible();
  await expect(list.getByText("Para 55 85 9••••-7777").first()).toBeVisible();
  await expect(page.getByText("5585999997777")).toHaveCount(0);
});
