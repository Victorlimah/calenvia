import { expect, test } from "@playwright/test";
import { cleanupCustomer, flowReady, goToCustomerStep } from "./helpers";

const PHONE = "5585966660001";
test.afterAll(() => cleanupCustomer(PHONE));

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

test("passo 3: faixa de dias, dias fechados desabilitados e grade de horários", async ({
  page,
}) => {
  await page.goto("/agendar");
  await flowReady(page);
  await page.getByRole("radio", { name: /Corte masculino/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Escolha o dia e o horário" })).toBeVisible();
  const days = page.getByRole("list", { name: "Dias" }).getByRole("button");
  await expect(days).toHaveCount(14);
  // Barbearia fecha domingo e segunda
  await expect(
    page.getByRole("button", { name: /^domingo, .*sem horários/ }).first(),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^segunda-feira, .*sem horários/ }).first(),
  ).toBeDisabled();
  // escolhe um horário da tarde
  const tarde = page.getByRole("list", { name: "Horários da tarde" }).getByRole("button");
  await tarde.first().click();
  await expect(tarde.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("contentinfo")).toContainText(" às ");
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled();
});

test("passo 4 e confirmação: valida, agenda e mostra a tela de confirmado", async ({ page }) => {
  await goToCustomerStep(page);
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByText("Informe seu nome.")).toBeVisible();
  await page.getByLabel("Seu nome").fill("Cliente Teste");
  await page.getByLabel("Seu WhatsApp").fill("8532221111");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(page.getByText(/Confira o número/)).toBeVisible();
  await page.getByLabel("Seu WhatsApp").fill("85966660001");
  await expect(page.getByLabel("Seu WhatsApp")).toHaveValue("(85) 9 6666-0001");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
  await expect(page.getByText("Corte masculino · 30 min")).toBeVisible();
  await expect(page.getByLabel("Mensagem de confirmação")).toContainText("Olá, Cliente! Aqui é da");

  const ics = await page.request.get(
    await page
      .getByRole("link", { name: "Adicionar ao calendário" })
      .getAttribute("href")
      .then((h) => h!),
  );
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("SUMMARY:Corte masculino — Barbearia do Zé");

  // Dados lembrados no navegador
  await goToCustomerStep(page);
  await expect(page.getByLabel("Seu nome")).toHaveValue("Cliente Teste");
  await expect(page.getByLabel("Seu WhatsApp")).toHaveValue("(85) 9 6666-0001");
});
