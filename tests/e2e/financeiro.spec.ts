import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

const reset = () => admin.from("finance_entries").delete().eq("business_id", ZE_BIZ);
test.beforeEach(reset);
test.afterAll(reset);

test("lança despesa e receita, vê o saldo e remove", async ({ page }) => {
  await loginAsZe(page, "/financeiro");
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
