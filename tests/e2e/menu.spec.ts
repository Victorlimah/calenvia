import { expect, test } from "./fixtures";
import { createRoleUser, loginAsZe, removeRoleUser } from "./helpers";

// CAL-117: menu principal por papel. O projeto roda no celular (Pixel 7): barra inferior.
const ROLES = ["manager", "reception", "staff"] as const;

test.afterAll(async () => {
  for (const r of ROLES) await removeRoleUser(r);
});

const EXPECTED: Record<string, string[]> = {
  owner: ["Início", "Agenda", "Clientes", "Meu negócio", "Ajustes"],
  manager: ["Início", "Agenda", "Clientes", "Meu negócio", "Ajustes"],
  reception: ["Início", "Agenda", "Clientes", "Ajustes"],
  staff: ["Início", "Agenda", "Clientes", "Ajustes"],
};

for (const role of ["owner", ...ROLES] as const) {
  test(`menu do celular para ${role} abre cada tela`, async ({ page }) => {
    test.setTimeout(180_000);
    const email = role === "owner" ? "ze@calenvia.dev" : await createRoleUser(role);
    await loginAsZe(page, "/", email);
    const nav = page.getByRole("navigation", { name: "Menu principal" }).last();
    await expect(nav.getByRole("link")).toHaveText(EXPECTED[role]);
    await expect(nav.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
    for (const label of EXPECTED[role].slice(1)) {
      await nav.getByRole("link", { name: label }).click();
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });
}

test("no celular, o Financeiro é uma aba do Início", async ({ page }) => {
  await loginAsZe(page, "/");
  await page
    .getByRole("navigation", { name: "Abas do Início" })
    .getByRole("link", { name: "Financeiro" })
    .click();
  await expect(page).toHaveURL(/\/financeiro/);
  const nav = page.getByRole("navigation", { name: "Menu principal" }).last();
  await expect(nav.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");
});

test("no computador, o menu lateral tem o Financeiro", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await loginAsZe(page, "/");
  const side = page.getByRole("navigation", { name: "Menu principal" }).first();
  await expect(side.getByRole("link")).toHaveText([
    "Início",
    "Agenda",
    "Clientes",
    "Financeiro",
    "Meu negócio",
    "Ajustes",
  ]);
  await side.getByRole("link", { name: "Financeiro" }).click();
  await expect(side.getByRole("link", { name: "Financeiro" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("links antigos da agenda (/?data=) continuam funcionando", async ({ page }) => {
  await loginAsZe(page, "/?data=2030-01-07&visao=semana");
  await expect(page).toHaveURL(/\/agenda\?data=2030-01-07&visao=semana/);
});
