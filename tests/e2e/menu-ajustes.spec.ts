import { expect, test } from "./fixtures";
import { SETTINGS_MENU } from "../../src/lib/settings-menu";
import { loginAsZe } from "./helpers";

// "Meus horários" só aparece para quem tem o acesso ligado a um profissional (CAL-112).
const ALL = SETTINGS_MENU.flatMap((g) => g.items).filter((i) => !i.needsStaff);

test("menu de Ajustes tem todas as telas e cada link abre", async ({ page }) => {
  test.setTimeout(300_000); // várias telas, cada uma compila na primeira visita no modo dev
  // Telas que existem e precisam estar no menu.
  for (const href of [
    "/ajustes/conta",
    "/ajustes/notificacoes",
    "/ajustes/mensagens-automaticas",
    "/ajustes/mensagens",
    "/assinatura",
    "/ajustes/google-agenda",
    "/ajustes/dominio",
    "/indicar",
    "/ajuda",
  ]) {
    expect(
      ALL.map((i) => i.href),
      href,
    ).toContain(href);
  }

  await loginAsZe(page, "/ajustes");
  for (const item of ALL) {
    await expect(page.getByRole("link", { name: new RegExp(item.title) }).first()).toHaveAttribute(
      "href",
      item.href,
    );
  }
  for (const item of ALL) {
    const res = await page.goto(item.href);
    expect(res?.status(), item.href).toBe(200);
    await expect(page.locator("h1").first(), item.href).toBeAttached({ timeout: 45_000 });
  }
});

test("Ajustes não tem nada do negócio (CAL-119)", () => {
  for (const item of ALL) {
    expect(item.href, item.title).not.toMatch(
      /^\/negocio|servicos|profissionais|horarios|pacotes|aparencia/,
    );
  }
});

test("conta: troca o nome e mostra o e-mail", async ({ page }) => {
  await loginAsZe(page, "/ajustes/conta");
  await expect(page.getByText("ze@calenvia.dev")).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill("Zé da Barbearia");
  await page.getByRole("button", { name: "Salvar nome" }).click();
  await expect(page.getByText("Nome salvo.")).toBeVisible();
  await page.getByLabel("Novo e-mail").fill("ze@calenvia.dev");
  await page.getByRole("button", { name: "Trocar e-mail" }).click();
  await expect(page.getByText("Esse já é o seu e-mail.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sair" }).first()).toBeVisible();
});
