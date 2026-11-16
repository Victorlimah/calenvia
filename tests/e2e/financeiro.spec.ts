import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe, ZE_BIZ } from "./helpers";

const reset = () => admin.from("finance_entries").delete().eq("business_id", ZE_BIZ);
test.beforeEach(reset);
test.afterAll(reset);

test("lança despesa e receita, vê o saldo e remove", async ({ page }) => {
  await loginAsZe(page, "/financeiro/lancamentos");
  await expect(page.getByText("Nenhum lançamento neste mês")).toBeVisible();

  await page.getByLabel("Valor (R$)").fill("1.200,00");
  await page.getByLabel("Categoria").selectOption("Aluguel");
  await page.getByLabel("Descrição (opcional)").fill("Sala do centro");
  await page.getByRole("button", { name: "Lançar" }).click();
  await expect(page.getByText("Despesa lançada.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Resumo financeiro" })).toContainText(
    "− R$ 1.200,00",
  );

  await page.getByText("Receita", { exact: true }).click();
  await page.getByLabel("Valor (R$)").fill("80");
  await page.getByRole("button", { name: "Lançar" }).click();
  await expect(page.getByText("Receita lançada.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Resumo financeiro" })).toContainText("R$ 80,00");

  await page.getByRole("button", { name: /Remover Aluguel/ }).click();
  await expect(page.getByText("Sala do centro")).toHaveCount(0);
  expect(await axeViolations(page)).toEqual([]);
});

// CAL-126/127/128: Financeiro unificado, faturamento por período e forma de pagamento.
const PHONE = "5585944440077";

test.describe("financeiro unificado", () => {
  test.afterEach(async () => {
    await cleanupCustomer(PHONE);
    await admin.from("businesses").update({ plan: "pro" }).eq("id", ZE_BIZ);
  });

  test("resumo por período, forma de pagamento e caixa", async ({ page }) => {
    const appt = await createTestAppointment(PHONE, "09:30");
    await admin
      .from("appointments")
      .update({ status: "completed", price_cents: 7000 })
      .eq("id", appt.id);

    // Marca a forma de pagamento no detalhe do atendimento
    await loginAsZe(page, `/agendamento/${appt.id}`);
    await page.getByText("Pix", { exact: true }).click();
    await expect(page.getByText("Forma de pagamento salva.")).toBeVisible();
    await page.waitForLoadState("networkidle"); // o refresh da tela termina antes de sair

    await page.goto(`/financeiro?periodo=dia&data=${appt.day}`);
    const resumo = page.getByRole("region", { name: "Resumo do período" });
    await expect(resumo).toContainText("R$ 70,00");
    await expect(page.getByText("Por serviço")).toBeVisible();
    const caixa = page.getByRole("list", { name: "Caixa por forma de pagamento" });
    await expect(caixa).toContainText("Pix");
    await expect(caixa).toContainText("R$ 70,00");
    // Plano Pro: comparação só no Pro+
    await expect(page.getByText(/comparação com o período anterior/)).toBeVisible();

    // Semana e período personalizado
    await page
      .getByRole("group", { name: "Período" })
      .getByRole("link", { name: "Semana" })
      .click();
    await expect(resumo).toContainText("R$ 70,00");
    await page.getByRole("link", { name: "Personalizado" }).click();
    await page.getByLabel("De", { exact: true }).fill(appt.day);
    await page.getByLabel("Até", { exact: true }).fill(appt.day);
    await page.getByRole("button", { name: "Ver" }).click();
    await expect(resumo).toContainText("R$ 70,00");
    expect(await axeViolations(page)).toEqual([]);
  });

  test("abas, exportação no Pro+ e endereços antigos", async ({ page }) => {
    await loginAsZe(page, "/relatorios?mes=2030-01");
    await expect(page).toHaveURL(/\/financeiro\/relatorios\?mes=2030-01/);
    await page.goto("/financeiro?mes=2030-01");
    await expect(page).toHaveURL(/\/financeiro\/lancamentos\?mes=2030-01/);
    const tabs = page.getByRole("navigation", { name: "Seções do Financeiro" });
    await tabs.getByRole("link", { name: "Exportar" }).click();
    await expect(page.getByText("Exportar faz parte do plano Pro+")).toBeVisible();
    await admin.from("businesses").update({ plan: "pro_plus" }).eq("id", ZE_BIZ);
    await page.reload();
    const download = page.waitForEvent("download");
    await page
      .getByRole("link", { name: /^Baixar CSV de / })
      .first()
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^financeiro-barbearia-do-ze-\d{4}-\d{2}\.csv$/);
  });
});
