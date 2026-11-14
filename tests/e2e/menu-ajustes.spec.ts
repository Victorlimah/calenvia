import { expect, test } from "./fixtures";
import { SETTINGS_MENU } from "../../src/lib/settings-menu";
import { loginAsZe } from "./helpers";

const ALL = SETTINGS_MENU.flatMap((g) => g.items);

test("menu de Ajustes tem todas as telas e cada link abre", async ({ page }) => {
  test.setTimeout(300_000); // 18 telas, cada uma compila na primeira visita no modo dev
  // Telas que existem e precisam estar no menu.
  for (const href of [
    "/ajustes/mensagens-automaticas",
    "/ajustes/mensagens",
    "/ajustes/pacotes",
    "/ajustes/google-agenda",
    "/financeiro",
    "/avaliacoes",
    "/relatorios",
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
