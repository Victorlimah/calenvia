import { expect, test } from "./fixtures";
import { admin, SIGNUP_OPEN } from "./helpers";

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

test("modo convite: /cadastro não tem formulário, só pedir acesso ou entrar", async ({ page }) => {
  test.skip(SIGNUP_OPEN, "Só no modo convite (padrão)");
  await page.goto("/cadastro");
  await expect(
    page.getByRole("heading", { name: "A Calenvia está em acesso por convite" }),
  ).toBeVisible();
  await expect(page.getByLabel("Senha")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Criar conta" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Pedir meu acesso no WhatsApp" })).toHaveAttribute(
    "href",
    /wa\.me\/5583986479932/,
  );
  await page.getByRole("link", { name: "Já tenho convite, entrar" }).click();
  await expect(page).toHaveURL(/\/entrar/);
  await expect(page.getByRole("link", { name: "Pedir acesso" })).toBeVisible();
});

test("modo convite: conta sem negócio não cria um pelo onboarding", async ({ page }) => {
  test.skip(SIGNUP_OPEN, "Só no modo convite (padrão)");
  const email = `semnegocio+${Date.now()}@calenvia.dev`;
  const { data } = await admin.auth.admin.createUser({
    email,
    password: "senhaforte123",
    email_confirm: true,
  });
  try {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("senhaforte123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByTestId("invite-only")).toBeVisible();
    await expect(page.getByLabel("Nome do negócio")).toHaveCount(0);
  } finally {
    if (data.user) await admin.auth.admin.deleteUser(data.user.id);
  }
});

test("cadastro cria conta e leva ao onboarding", async ({ page }) => {
  test.skip(!SIGNUP_OPEN, "Só com SIGNUP_MODE=open");
  const email = `teste+${Date.now()}@calenvia.dev`;
  await page.goto("/cadastro?plano=pro");
  await expect(page.getByText("Plano escolhido")).toBeVisible();
  await page.getByLabel("Seu nome").fill("Maria Teste");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding\?plano=pro/);
});
