import { expect, test, type Page } from "@playwright/test";

export async function flowReady(page: Page) {
  await expect(page.locator("[data-ready]")).toBeAttached();
}

test.use({ baseURL: "http://barbearia-do-ze.localhost:3000" });

test("passo 1: escolhe o serviço e vê o resumo no rodapé", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Agendar meu horário" }).first().click();
  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await expect(page.getByText("Passo 1 de 4")).toBeVisible();
  await flowReady(page);
  const continuar = page.getByRole("button", { name: "Continuar" });
  await expect(continuar).toBeDisabled();
  await page.getByRole("radio", { name: /Corte \+ barba/ }).click();
  await expect(page.getByRole("contentinfo")).toContainText("Corte + barba");
  await expect(page.getByRole("contentinfo")).toContainText("R$ 60,00");
  await expect(continuar).toBeEnabled();
});

test("serviço escolhido na landing já vem marcado", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Barba completa/ }).click();
  await expect(page.getByRole("radio", { name: /Barba completa/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("passo 2: sem preferência é o padrão e só aparecem profissionais aptos", async ({ page }) => {
  await page.goto("/agendar");
  await flowReady(page);
  await page.getByRole("radio", { name: /Barba completa/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Com quem?" })).toBeVisible();
  // Rafael não faz barba completa: só o Zé aparece, já escolhido
  await expect(page.getByRole("radio")).toHaveCount(1);
  await expect(page.getByRole("radio", { name: /Zé Carlos/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await page.getByRole("radio", { name: /Corte masculino/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("radio", { name: /Sem preferência/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("radio")).toHaveCount(3);
  await page.getByRole("radio", { name: /Rafael Lima/ }).click();
  await expect(page.getByRole("contentinfo")).toContainText("Rafael Lima");
});
