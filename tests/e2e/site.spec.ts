import { expect, test } from "./fixtures";
import { admin, BILLING_ON, loginAsZe } from "./helpers";

const SITE = "http://localhost:3000";

test.describe("sem cobrança (padrão): home pede acesso por convite", () => {
  test.skip(BILLING_ON, "Só com BILLING_ENABLED=false");

  test("nenhum preço nem 'criar conta'; CTAs levam a Pedir meu acesso", async ({ page }) => {
    await page.goto(SITE);
    await expect(page.getByRole("heading", { level: 1, name: /Sua agenda cheia/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("R$");
    await expect(page.locator("body")).not.toContainText(/Assinar|Criar conta|Começar grátis/);
    await expect(page.locator('a[href*="/cadastro"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Estamos abrindo aos poucos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedir meu acesso no WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me\/5583986479932\?text=/,
    );
    await expect(page.getByRole("link", { name: "Entrar no painel" })).toHaveAttribute(
      "href",
      "http://app.localhost:3000/entrar",
    );
    await page.getByRole("link", { name: "Pedir meu acesso" }).first().click();
    await expect(page).toHaveURL(/#acesso$/);
  });

  test("lista de espera recebe o contato e o admin vê e exporta", async ({ page }) => {
    const stamp = Date.now();
    const business = `Pet Feliz ${stamp}`;
    try {
      await page.goto(`${SITE}/#acesso`);
      const form = page.locator("form.access-form");
      await form.getByLabel("Seu nome").fill("Rita Teste");
      await form.getByLabel("Nome do negócio").fill(business);
      await form.getByLabel("WhatsApp").fill("83986479932");
      await form.getByLabel("Tipo de negócio (opcional)").selectOption("pet");
      await form.getByRole("button", { name: "Entrar na lista de espera" }).click();
      await expect(page.getByText("Recebemos seu pedido!")).toBeVisible();

      await loginAsZe(page, "/admin/lista-de-espera", "admin@calenvia.dev");
      await expect(page.getByTestId("access-request").filter({ hasText: business })).toContainText(
        "Pet shop",
      );
      // Pelo navegador (a porta do E2E pode ser outra que a 3000).
      const csv = await page.evaluate(async () => {
        const r = await fetch("/admin/lista-de-espera/csv");
        return { type: r.headers.get("content-type") ?? "", text: await r.text() };
      });
      expect(csv.type).toContain("text/csv");
      expect(csv.text).toContain(business);
    } finally {
      await admin.from("access_requests").delete().eq("business_name", business);
    }
  });

  test("/cadastro?plano= volta para a home", async ({ page }) => {
    await page.goto("http://app.localhost:3000/cadastro?plano=pro");
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/#acesso$/);
  });
});

test("site da Calenvia: seções, planos com preço e botões para o cadastro", async ({ page }) => {
  test.skip(!BILLING_ON, "Só com BILLING_ENABLED=true");
  await page.goto(SITE);
  await expect(page.getByRole("heading", { level: 1, name: /Sua agenda cheia/ })).toBeVisible();
  for (const name of [
    /Como funciona|3 passos/,
    /Um plano para cada tamanho/,
    /Perguntas frequentes/,
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByText("44,90").first()).toBeVisible();
  for (const [label, plan] of [
    ["Escolher Básico", "basic"],
    ["Escolher Pro", "pro"],
    ["Escolher Pro+", "pro_plus"],
  ]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute(
      "href",
      `http://app.localhost:3000/cadastro?plano=${plan}`,
    );
  }
  await expect(page.getByText(/\[Defina|\[Pix/)).toHaveCount(0);
});

test("menu do celular abre e fecha", async ({ page }) => {
  const label = BILLING_ON ? "Planos" : "Pedir meu acesso";
  await page.goto(SITE);
  const toggle = page.getByRole("button", { name: "Abrir menu" });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: label, exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
});

test("botão Escolher Pro leva ao cadastro com o plano", async ({ page }) => {
  test.skip(!BILLING_ON, "Só com BILLING_ENABLED=true");
  await page.goto(SITE);
  await page.getByRole("link", { name: "Escolher Pro", exact: true }).click();
  await expect(page).toHaveURL(/app\.localhost:3000\/cadastro\?plano=pro$/);
  await expect(page.getByText(/Pro/).first()).toBeVisible();
});

test("termos e privacidade abrem pelo rodapé", async ({ page }) => {
  await page.goto(SITE);
  await page.getByRole("link", { name: "Termos de uso" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Termos de uso" })).toBeVisible();
  await expect(page.getByText(/Última atualização/)).toBeVisible();
  await page.goto(`${SITE}/privacidade`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Política de privacidade" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Seus direitos/ })).toBeVisible();
});
