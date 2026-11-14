import { expect, test } from "@playwright/test";
import { loginAsZe, seededDay } from "./helpers";

test("agenda do dia mostra agendamentos, livres e bloqueios", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/?data=${day}`);
  const timeline = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(timeline.getByText("Lucas Andrade").first()).toBeVisible();
  await expect(timeline.getByText("Pedro Henrique")).toBeVisible();
  await expect(timeline.getByText(/Bloqueado até 19:00/)).toBeVisible();
  await expect(timeline.getByRole("link", { name: /Livre/ }).first()).toBeVisible();
  await expect(page.getByLabel("Resumo do dia")).toContainText("4");

  // Navega para o dia seguinte e volta
  await page.getByRole("link", { name: "Próximo dia" }).click();
  await expect(page).toHaveURL(/data=/);
  await page.getByRole("link", { name: "Dia anterior" }).click();
  await expect(timeline.getByText("Pedro Henrique")).toBeVisible();
});

test("horário livre leva ao novo agendamento já preenchido", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/?data=${day}`);
  const link = page
    .getByRole("list", { name: "Linha do tempo do dia" })
    .getByRole("link", { name: /Livre/ })
    .first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(new RegExp(`^/novo\\?data=${day}&hora=\\d\\d:\\d\\d`));
});
