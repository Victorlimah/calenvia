import { expect, test } from "./fixtures";
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

test("filtra por profissional e mostra a semana", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/?data=${day}`);
  const timeline = page.getByRole("list", { name: "Linha do tempo do dia" });
  await page
    .getByRole("navigation", { name: "Filtrar por profissional" })
    .getByRole("link", { name: "Rafael" })
    .click();
  await expect(timeline.getByText("Mateus Rocha")).toBeVisible();
  await expect(timeline.getByText("Pedro Henrique")).toHaveCount(0);
  await page.getByRole("link", { name: "Semana" }).click();
  const week = page.getByRole("list", { name: "Semana" });
  await expect(week.getByRole("listitem").filter({ has: page.getByRole("link") })).toHaveCount(7);
  await expect(week.getByText("Mateus Rocha")).toBeVisible();
  await expect(week.getByText("Pedro Henrique")).toHaveCount(0);
});

test("seletor de data navega", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, "/");
  await page.getByLabel("Escolher data").fill(day);
  await expect(page).toHaveURL(new RegExp(`data=${day}`));
  await expect(page.getByText("Pedro Henrique")).toBeVisible();
});
