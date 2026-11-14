import { expect, test } from "./fixtures";

test.use({ baseURL: "http://barbearia-do-ze.localhost:3000" });

test("página pública do negócio tem as seções e um único tipo de ação", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Seu corte no horário certo");
  for (const title of [
    "Agende em menos de 1 minuto",
    "Escolha o seu",
    "Quem atende",
    "Endereço e horários",
    "Perguntas frequentes",
  ]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  }
  await expect(page.getByText("Mais pedido").first()).toBeVisible();
  await expect(page.getByText("9h às 12h e 13h às 19h").first()).toBeVisible();

  // Todos os botões levam ao agendamento
  const ctas = page.getByRole("link", { name: "Agendar meu horário" });
  expect(await ctas.count()).toBeGreaterThanOrEqual(3);
  for (const href of await ctas.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
    expect(href).toBe("/agendar");
  }
  // Barra fixa no rodapé visível no celular
  await expect(ctas.last()).toBeInViewport();
});

test("dúvidas abrem e fecham", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Preciso criar conta ou baixar aplicativo?").click();
  await expect(page.getByText("Não. Você escolhe o serviço")).toBeVisible();
});

test("slug inexistente mostra 404 amigável", async ({ page }) => {
  const res = await page.goto("http://nao-existe-mesmo.localhost:3000/");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});
