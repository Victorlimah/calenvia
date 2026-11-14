import { expect, test } from "./fixtures";

test("dono novo escolhe o Pro no site, cria a conta e conclui o onboarding", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/cadastro?plano=pro");
  await expect(page.getByText("Plano escolhido:")).toBeVisible();
  await page.getByLabel("Seu nome").fill("Carla Souza");
  await page.getByLabel("E-mail").fill(`carla+${stamp}@calenvia.dev`);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Passo 1: dados do negócio
  await page.getByLabel("Nome do negócio").fill(`Studio Carla ${stamp}`);
  await page.getByLabel("Tipo de negócio").selectOption("estetica");
  await page.getByLabel("WhatsApp do negócio").fill("85999998888");
  await page
    .getByLabel("Endereço", { exact: true })
    .fill("Rua das Flores, 10 — Centro, Fortaleza/CE");
  await expect(page.getByLabel("Endereço da sua página")).toHaveValue(`studio-carla-${stamp}`);
  await expect(page.getByText("Disponível:")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();

  // Passo 2: serviços
  await expect(page).toHaveURL(/\/onboarding\/servicos/);
  await page.getByLabel("Nome", { exact: true }).fill("Limpeza de pele");
  await page.getByLabel("Duração").selectOption("60");
  await page.getByLabel("Preço (R$)").fill("120");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 120,00")).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();

  // Passo 3: equipe
  await expect(page).toHaveURL(/\/onboarding\/profissionais/);
  await page.getByRole("button", { name: "Eu mesmo atendo" }).click();
  await expect(page.getByText("Carla Souza")).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();

  // Passo 4: horários (padrão)
  await expect(page).toHaveURL(/\/onboarding\/horarios/);
  await page.getByRole("button", { name: "Salvar e finalizar" }).click();

  // Pronto
  await expect(page).toHaveURL(/\/onboarding\/pronto/);
  await expect(page.getByText(`studio-carla-${stamp}.localhost:3000`)).toBeVisible();
  await expect(page.getByText("Seu plano:")).toContainText("Pro");
  await page.getByRole("link", { name: "Ir para a agenda" }).click();
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
});

test("slug já usado mostra sugestões", async ({ page }) => {
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Outro Zé");
  await page.getByLabel("E-mail").fill(`ze2+${Date.now()}@calenvia.dev`);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Nome do negócio").fill("Barbearia do Zé");
  await expect(page.getByText("Esse endereço já está em uso.")).toBeVisible();
  await expect(page.getByRole("button", { name: "barbearia-do-ze-oficial" })).toBeVisible();
});
