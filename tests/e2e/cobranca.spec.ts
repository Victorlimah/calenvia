import { expect, test } from "./fixtures";
import { admin } from "./helpers";

/**
 * Cobrança (CAL-076): cadastro → onboarding → checkout com extra → pagamento simulado →
 * assinatura ativa e página pública aberta.
 */
test("dono novo assina com o pagamento simulado e a página pública abre", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const slug = `cobranca-${stamp}`;
  await page.goto("/cadastro?plano=pro");
  await page.getByLabel("Seu nome").fill("Bia Cobrança");
  await page.getByLabel("E-mail").fill(`bia+${stamp}@calenvia.dev`);
  await page.getByLabel("Senha").fill("senhaforte123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 45_000 });

  await page.getByLabel("Nome do negócio").fill(`Cobranca ${stamp}`);
  await page.getByLabel("Tipo de negócio").selectOption("estetica");
  await page.getByLabel("WhatsApp do negócio").fill("85999997777");
  await page.getByLabel("Endereço", { exact: true }).fill("Rua A, 1 — Centro, Fortaleza/CE");
  await expect(page.getByLabel("Endereço da sua página")).toHaveValue(slug);
  await expect(page.getByText("Disponível:")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/onboarding\/servicos/);
  await page.getByLabel("Nome", { exact: true }).fill("Limpeza de pele");
  await page.getByLabel("Duração").selectOption("60");
  await page.getByLabel("Preço (R$)").fill("120");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 120,00")).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Eu mesmo atendo" }).click();
  await expect(page.getByText("Bia Cobrança")).toBeVisible();
  await page.getByRole("link", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Salvar e finalizar" }).click();
  await expect(page).toHaveURL(/\/onboarding\/pronto/);

  // Sem pagar, a página pública não recebe agendamentos.
  const visitor = await browser.newPage();
  await visitor.goto(`http://${slug}.localhost:3000/`);
  await expect(visitor.getByRole("link", { name: "Agendar meu horário" })).toHaveCount(0);

  // Checkout: Pro + 1 pacote de mensagens.
  await page.getByRole("link", { name: "Assinar e ativar" }).click();
  await expect(page).toHaveURL(/\/assinatura\/checkout/);
  await expect(page.getByRole("radio", { name: /Pro\b/ }).first()).toBeChecked();
  await page.getByRole("button", { name: "Mais +100 mensagens/mês" }).click();
  await expect(page.getByTestId("checkout-total")).toHaveText(/54,90/);
  await page.getByRole("button", { name: "Ir para o pagamento" }).click();

  await expect(page).toHaveURL(/\/pagamento-simulado\//);
  await expect(page.getByText("+100 mensagens/mês")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar pagamento" }).click();
  await expect(page).toHaveURL(/\/assinatura\?ativado=1/);
  await expect(page.getByText("Assinatura ativada!")).toBeVisible();

  const { data: biz } = await admin
    .from("businesses")
    .select("plan, plan_status, addon_messages")
    .eq("slug", slug)
    .single();
  expect(biz).toEqual({ plan: "pro", plan_status: "active", addon_messages: 100 });

  await visitor.reload();
  await expect(visitor.getByRole("link", { name: "Agendar meu horário" }).first()).toBeVisible();
  await visitor.close();
});
