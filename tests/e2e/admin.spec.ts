import { expect, test } from "./fixtures";
import { admin, ANA_BIZ, loginAsZe, seededDay, ZE_BIZ } from "./helpers";

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
  await expect(page.getByRole("heading", { name: "Negócios", exact: true })).toBeVisible();

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
  // No celular o menu do admin fica recolhido (CAL-129): abre antes de conferir o contador.
  await page.locator("summary").filter({ hasText: "Menu" }).click();
  await expect(page.getByRole("link", { name: /Suporte.*pedidos? abertos?/ })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Menu" }).click();
  const card = page
    .getByRole("listitem")
    .filter({ hasText: "Pedido de teste E2E da administração" });
  await card.getByLabel("Resposta").fill("Já ajustamos sua agenda. Qualquer coisa, chame!");
  await card.getByLabel("Status").selectOption("answered");
  await card.getByRole("button", { name: "Salvar pedido" }).click();
  await expect(card.getByText(/Pedido atualizado/)).toBeVisible();

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

test("admin vê o painel do cliente só para leitura e o acesso vai para o histórico", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const day = await seededDay();
  const { data: appt } = await admin
    .from("appointments")
    .select("customer_name")
    .eq("business_id", ZE_BIZ)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .single();

  await loginAsZe(page, `/admin/negocios/${ZE_BIZ}`, "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname.startsWith("/admin/negocios"));
  await page.getByRole("link", { name: "Ver painel do cliente" }).click();
  await expect(page.getByText(/Você está vendo o painel de\s+Barbearia do Zé/)).toBeVisible();

  await page.goto(`/admin/negocios/${ZE_BIZ}/visao?data=${day}`);
  const list = page.getByRole("list", { name: "Agendamentos do dia" });
  await expect(list.getByText(appt!.customer_name).first()).toBeVisible();
  for (const name of [/salvar/i, /cancelar/i, /remarcar/i, /excluir/i]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }

  for (const tab of [
    "Clientes",
    "Serviços e profissionais",
    "Horários",
    "Equipe e convites",
    "Mensagens",
    "Ajustes",
  ]) {
    await page
      .getByRole("navigation", { name: "Telas do painel do cliente" })
      .getByRole("link", { name: tab })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: tab })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /salvar|cancelar|remarcar|excluir/i }),
    ).toHaveCount(0);
  }

  // Recarregar não duplica o registro (um a cada 10 minutos por página).
  await page.goto(`/admin/negocios/${ZE_BIZ}/visao`);
  const { count } = await admin
    .from("admin_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("business_id", ZE_BIZ)
    .eq("action", "view_as")
    .eq("changes->page->>to", "agenda");
  expect(count).toBe(1);

  await page.goto(`/admin/negocios/${ZE_BIZ}`);
  const history = page.getByRole("region", { name: "Histórico da administração" });
  await expect(history.getByText("Viu o painel (agenda)")).toBeVisible();
});

test("dono não abre a visão do painel pela administração (404)", async ({ page }) => {
  await loginAsZe(page, "/");
  const res = await page.goto(`http://app.localhost:3000/admin/negocios/${ZE_BIZ}/visao`);
  expect(res?.status()).toBe(404);
});

test("cobrança no admin: preços e extras de um negócio (CAL-115)", async ({ page }) => {
  await admin
    .from("business_addons")
    .update({ removed_at: new Date().toISOString() })
    .eq("business_id", ANA_BIZ)
    .is("removed_at", null);
  await admin.rpc("recompute_business_addons", { p_business_id: ANA_BIZ });
  await loginAsZe(page, "/admin/precos", "admin@calenvia.dev");
  await expect(page.getByRole("heading", { name: "Preços e extras" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "+100 mensagens/mês" })).toBeVisible();

  await page.goto(`/admin/negocios/${ANA_BIZ}`);
  await expect(page.getByRole("heading", { name: "Cobrança" })).toBeVisible();
  await expect(page.getByText("Manual (sem cobrança)")).toBeVisible();
  await page
    .getByLabel("Extra", { exact: true })
    .selectOption({ label: "+1 pessoa na equipe · R$ 5,00/mês" });
  await page.getByRole("button", { name: "Adicionar extra" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /\+1 pessoa na equipe × 1 adicionado/ }),
  ).toBeVisible();
  const { data } = await admin
    .from("businesses")
    .select("addon_members")
    .eq("id", ANA_BIZ)
    .single();
  expect(data!.addon_members).toBe(1);

  await page.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByText("Nenhum extra.")).toBeVisible();
  const { data: after } = await admin
    .from("businesses")
    .select("addon_members")
    .eq("id", ANA_BIZ)
    .single();
  expect(after!.addon_members).toBe(0);
});

// CAL-129/130: menu organizado, Sair e lista completa de negócios.
test("admin sai pelo menu e volta para o login", async ({ page }) => {
  await loginAsZe(page, "/admin", "admin@calenvia.dev");
  await page.waitForURL((u) => u.pathname === "/admin");
  await page.locator("summary").filter({ hasText: "Menu" }).click();
  const nav = page.getByRole("navigation", { name: "Administração (celular)" });
  for (const label of ["Negócios", "Suporte", "Assinaturas", "Preços", "Métricas", "Mensagens"]) {
    await expect(nav.getByRole("link", { name: new RegExp(`^${label}`) })).toBeVisible();
  }
  await nav.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL((u) => u.pathname.startsWith("/entrar"));
  // sessão limpa: o admin não abre mais
  const res = await page.goto("http://app.localhost:3000/admin");
  await page.waitForURL((u) => u.pathname.startsWith("/entrar"));
  expect(res?.ok()).toBe(true);
});

test("lista de negócios: todos aparecem, com busca por e-mail e WhatsApp", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await admin.from("businesses").update({ plan_status: "suspended" }).eq("id", ANA_BIZ);
  try {
    await loginAsZe(page, "/admin", "admin@calenvia.dev");
    await page.waitForURL((u) => u.pathname === "/admin");
    await expect(page.getByRole("heading", { name: "O que fazer agora" })).toBeVisible();
    const table = page.getByRole("table", { name: "Negócios da Calenvia" });
    await expect(table.getByRole("link", { name: "Barbearia do Zé" })).toBeVisible();
    // suspensa continua na lista, com rótulo
    const ana = table.getByRole("row").filter({ hasText: "Ana Nails" });
    await expect(ana).toContainText("Suspensa");
    await page.getByLabel("Buscar").fill("ana@calenvia.dev");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(table.getByRole("row")).toHaveCount(2); // cabeçalho + 1
    const { data: biz } = await admin
      .from("businesses")
      .select("whatsapp")
      .eq("id", ANA_BIZ)
      .single();
    await page.getByLabel("Buscar").fill(biz!.whatsapp.slice(-8));
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(table.getByRole("link", { name: "Ana Nails" })).toBeVisible();
    await page.getByLabel("Ordenar por").selectOption("valor");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/ordem=valor/);
  } finally {
    await admin.from("businesses").update({ plan_status: "active" }).eq("id", ANA_BIZ);
  }
});
