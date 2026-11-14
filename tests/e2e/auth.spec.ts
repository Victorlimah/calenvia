import { expect, test } from "@playwright/test";

test("dono entra com e-mail e senha e vê o painel", async ({ page }) => {
  await page.goto("/agenda");
  await expect(page).toHaveURL(/\/entrar\?next=%2Fagenda/);
  await page.getByLabel("E-mail").fill("ze@calenvia.dev");
  await page.getByLabel("Senha").fill("calenvia123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/app\.localhost:3000\/agenda/);
});

test("senha errada mostra mensagem amigável", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("ze@calenvia.dev");
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("cadastro cria conta e leva ao onboarding", async ({ page }) => {
  const email = `teste+${Date.now()}@calenvia.dev`;
  await page.goto("/cadastro?plano=pro");
  await expect(page.getByText("Plano escolhido")).toBeVisible();
  await page.getByLabel("Seu nome").fill("Maria Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding\?plano=pro/);
});
