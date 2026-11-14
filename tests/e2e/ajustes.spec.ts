import { expect, test, type Page } from "@playwright/test";

async function loginAsZe(page: Page, next = "/") {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill("ze@calenvia.dev");
  await page.getByLabel("Senha").fill("calenvia123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, "\\$&") + "$"));
}

test("edita um serviço nos ajustes", async ({ page }) => {
  await loginAsZe(page, "/ajustes/servicos");
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Preço (R$)").fill("45,00");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 45,00").first()).toBeVisible();
  // volta ao preço do seed
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Preço (R$)").fill("40,00");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 40,00").first()).toBeVisible();
});

test("cadastra profissional com serviços", async ({ page }) => {
  await loginAsZe(page, "/ajustes/profissionais");
  await page.getByRole("button", { name: "+ Adicionar profissional" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Bruno Teste");
  await page.getByLabel("Barba completa").uncheck();
  await page.getByRole("button", { name: "Salvar profissional" }).click();
  await expect(page.getByText("Bruno Teste")).toBeVisible();
  await page.getByRole("button", { name: "Editar" }).last().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Bruno Teste")).toHaveCount(0);
});

test("horário inválido mostra erro", async ({ page }) => {
  await loginAsZe(page, "/ajustes/horarios");
  await page.getByLabel("Fecha (Terça)").fill("08:00");
  await page.getByRole("button", { name: "Salvar horários" }).click();
  await expect(page.getByText(/Terça: O fechamento precisa ser depois/)).toBeVisible();
});

test("navegação inferior leva aos ajustes", async ({ page }) => {
  await loginAsZe(page, "/");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .last()
    .getByRole("link", { name: "Ajustes" })
    .click();
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
});
