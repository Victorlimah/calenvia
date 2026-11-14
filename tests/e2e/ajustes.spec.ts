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

test("salva as regras da agenda", async ({ page }) => {
  await loginAsZe(page, "/ajustes/regras");
  await page.getByLabel("Intervalo entre horários").selectOption("15");
  await page.getByRole("button", { name: "Salvar regras" }).click();
  await expect(page.getByText("Regras salvas.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Intervalo entre horários")).toHaveValue("15");
  await page.getByLabel("Intervalo entre horários").selectOption("30");
  await page.getByRole("button", { name: "Salvar regras" }).click();
  await expect(page.getByText("Regras salvas.")).toBeVisible();
});

test("envia e remove a foto de um profissional", async ({ page }) => {
  await loginAsZe(page, "/ajustes/profissionais");
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Enviar foto").setInputFiles("tests/e2e/fixtures/foto.png");
  await expect(page.getByRole("button", { name: "Remover foto" })).toBeVisible({ timeout: 15000 });
  const src = await page.locator("img").first().getAttribute("src");
  expect(src).toMatch(/business-media\/.+\/staff\/.+\.webp$/);
  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByRole("button", { name: "Remover foto" })).toHaveCount(0);
});

test("aparência: prévia ao vivo, cor e capa", async ({ page }) => {
  await loginAsZe(page, "/ajustes/aparencia");
  const preview = page.getByRole("complementary", { name: "Prévia da página" });
  await page.getByLabel("Título da página").fill("Corte de respeito");
  await expect(preview.getByRole("heading", { name: "Corte de respeito" })).toBeVisible();
  await page.getByRole("button", { name: "Cor #1F9D55" }).click();
  await page.getByRole("button", { name: "Salvar aparência" }).click();
  await expect(page.getByText("Aparência salva.")).toBeVisible();
  await page.getByLabel("Enviar foto de capa").setInputFiles("tests/e2e/fixtures/foto.png");
  await expect(page.getByRole("button", { name: "Remover capa" })).toBeVisible({ timeout: 15000 });
  // restaura
  await page.getByRole("button", { name: "Remover capa" }).click();
  await page.getByLabel("Título da página").fill("Seu corte no horário certo, sem fila.");
  await page.getByRole("button", { name: "Cor #F5B014" }).click();
  await page.getByRole("button", { name: "Salvar aparência" }).click();
  await expect(page.getByText("Aparência salva.")).toBeVisible();
});

test("link da página para copiar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsZe(page, "/ajustes/link");
  await expect(page.getByText("barbearia-do-ze.localhost:3000")).toBeVisible();
  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("button", { name: "Link copiado!" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver minha página" })).toHaveAttribute(
    "href",
    "http://barbearia-do-ze.localhost:3000/",
  );
});
