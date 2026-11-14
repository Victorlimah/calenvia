import { expect, test } from "./fixtures";

const SITE = "http://localhost:3000";

test("site da Calenvia: seções, planos com preço e botões para o cadastro", async ({ page }) => {
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
  await page.goto(SITE);
  const toggle = page.getByRole("button", { name: "Abrir menu" });
  await toggle.click();
  await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Planos" })
    .click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
});

test("botão Escolher Pro leva ao cadastro com o plano", async ({ page }) => {
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
