import { expect, test } from "./fixtures";
import { loginAsZe, seededDay } from "./helpers";

test("agenda do dia mostra agendamentos, livres e bloqueios", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}`);
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
  await loginAsZe(page, `/agenda?data=${day}`);
  const link = page
    .getByRole("list", { name: "Linha do tempo do dia" })
    .getByRole("link", { name: /Livre/ })
    .first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(new RegExp(`^/novo\\?data=${day}&hora=\\d\\d:\\d\\d`));
});

test("filtra por profissional e mostra a semana", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}`);
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
  await loginAsZe(page, "/agenda");
  await page.getByLabel("Escolher data").fill(day);
  await expect(page).toHaveURL(new RegExp(`data=${day}`));
  await expect(page.getByText("Pedro Henrique")).toBeVisible();
});

// CAL-120: navegação da visão Semana e filtros que não se perdem.
const RAFAEL = "0d000000-0000-4000-8000-000000000002";

test("semana anda 7 dias e mantém visão e profissional", async ({ page }) => {
  await loginAsZe(page, `/agenda?data=2030-01-09&visao=semana&profissional=${RAFAEL}`);
  await expect(page.getByText("7 a 13 de jan", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Próxima semana" }).click();
  await expect(page).toHaveURL(/data=2030-01-16/);
  await expect(page).toHaveURL(/visao=semana/);
  await expect(page).toHaveURL(new RegExp(`profissional=${RAFAEL}`));
  await expect(page.getByText("14 a 20 de jan", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Semana anterior" }).click();
  await expect(page).toHaveURL(/data=2030-01-09/);
  await page.getByRole("link", { name: "Semana anterior" }).click();
  await expect(page).toHaveURL(/data=2030-01-02/);
  await expect(page.getByText("31 de dez de 2029 a 6 de jan de 2030")).toBeVisible();
  // filtro continua marcado
  await expect(
    page
      .getByRole("navigation", { name: "Filtrar por profissional" })
      .getByRole("link", { name: "Rafael" }),
  ).toHaveAttribute("aria-current", "true");
});

test("Hoje volta para o dia atual mantendo a visão", async ({ page }) => {
  await loginAsZe(page, "/agenda?data=2030-01-09&visao=semana");
  await page.getByRole("link", { name: "Hoje", exact: true }).click();
  await expect(page).toHaveURL(/visao=semana/);
  await expect(page).not.toHaveURL(/data=2030/);
});

test("trocar profissional e data não perde a visão", async ({ page }) => {
  await loginAsZe(page, "/agenda?data=2030-01-09&visao=semana");
  await page
    .getByRole("navigation", { name: "Filtrar por profissional" })
    .getByRole("link", { name: "Rafael" })
    .click();
  await expect(page).toHaveURL(new RegExp(`profissional=${RAFAEL}`));
  await expect(page).toHaveURL(/visao=semana/);
  await page.getByLabel("Escolher data").fill("2030-02-06");
  await expect(page).toHaveURL(/data=2030-02-06/);
  await expect(page).toHaveURL(/visao=semana/);
  await expect(page).toHaveURL(new RegExp(`profissional=${RAFAEL}`));
  await page
    .getByRole("navigation", { name: "Filtrar por profissional" })
    .getByRole("link", { name: "Todos" })
    .click();
  await expect(page).not.toHaveURL(/profissional=/);
  await expect(page).toHaveURL(/visao=semana/);
});

test("na Lista, anterior/próximo andam 1 dia", async ({ page }) => {
  await loginAsZe(page, "/agenda?data=2030-01-09&visao=lista");
  await page.getByRole("link", { name: "Próximo dia" }).click();
  await expect(page).toHaveURL(/data=2030-01-10&visao=lista/);
});

// CAL-121/122: visões Dia, Semana e Mês.
test("visão Mês no computador: chips, abrir o dia e + com a data", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}&visao=mes`);
  const cal = page.getByRole("table", { name: /^Calendário de / });
  await expect(cal).toBeVisible();
  await expect(cal.getByRole("link", { name: /Lucas Andrade/ }).first()).toBeVisible();
  const plus = cal.getByRole("link", { name: /^Novo agendamento em / }).first();
  await expect(plus).toHaveAttribute("href", /^\/novo\?data=\d{4}-\d\d-\d\d$/);
  await cal
    .getByRole("link", { name: /\d+ agendamentos?$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/visao=lista/);
  await expect(page.getByRole("list", { name: "Linha do tempo do dia" })).toBeVisible();
});

test("visão Mês no celular: grade compacta e lista do dia escolhido", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}&visao=mes`);
  const compact = page.getByRole("table", { name: /compacto/ });
  await expect(compact).toBeVisible();
  const list = page.getByRole("region", { name: "Agendamentos do dia escolhido" });
  await expect(list.getByText("Pedro Henrique")).toBeVisible();
  await page.getByRole("link", { name: "Próximo mês" }).click();
  await expect(page).toHaveURL(/visao=mes/);
});

test("visão Semana no computador: grade por hora", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}&visao=semana`);
  const grid = page.getByRole("region", { name: /^Semana de / });
  await expect(grid).toBeVisible();
  await expect(grid.getByRole("link", { name: /Pedro Henrique/ })).toBeVisible();
});

test("visão Dia: uma coluna por profissional", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const day = await seededDay();
  await loginAsZe(page, `/agenda?data=${day}&visao=dia`);
  const grid = page.getByRole("region", { name: "Dia por profissional" });
  await expect(grid.getByRole("list", { name: /Agendamentos: Zé/ })).toBeVisible();
  await expect(grid.getByRole("list", { name: /Agendamentos: Rafael/ })).toBeVisible();
  await expect(grid.getByRole("link", { name: /Mateus Rocha/ })).toBeVisible();
});

test("lembra a última visão escolhida", async ({ page }) => {
  await loginAsZe(page, "/agenda");
  await page.getByRole("group", { name: "Visão" }).getByRole("link", { name: "Mês" }).click();
  await expect(page).toHaveURL(/visao=mes/);
  await page.goto("/agenda");
  await expect(page.getByRole("table", { name: /compacto/ })).toBeVisible();
  // volta para a lista (não deixa a preferência para os outros testes)
  await page.getByRole("group", { name: "Visão" }).getByRole("link", { name: "Lista" }).click();
  await expect(page).toHaveURL(/visao=lista/);
});
