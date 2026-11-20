import { expect, test } from "./fixtures";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

// CAL-148: galeria de temas com prévia ao vivo do próprio negócio.
test.afterAll(async () => {
  await admin
    .from("businesses")
    .update({ theme: null, logo_url: null, accent_color: "#F5B014" })
    .eq("id", ZE_BIZ);
});

test("escolhe template, muda paleta, sobe logo, salva e a página pública fica igual à prévia", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginAsZe(page, "/negocio/aparencia/temas");
  await expect(page.getByRole("heading", { name: "Temas da página" })).toBeVisible();
  // Cartões são botões; o tema em uso tem selo.
  await expect(page.getByRole("button", { name: "Ver o tema Noturno (em uso)" })).toBeVisible();
  await page.getByRole("button", { name: "Ver o tema Delicado" }).click();

  const dialog = page.getByRole("dialog", { name: "Prévia do tema Delicado" });
  await expect(dialog).toBeVisible();
  const frame = page.frameLocator('iframe[title^="Prévia da página"]');
  await expect(frame.getByText("Barbearia do Zé").first()).toBeVisible();
  await expect(frame.locator("[data-template]")).toHaveAttribute("data-template", "delicado");

  // Descartar não altera nada.
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Lavanda suave" }).click();
  await dialog.getByRole("button", { name: "← Voltar" }).click();
  const { data: before } = await admin.from("businesses").select("theme").eq("id", ZE_BIZ).single();
  expect(before?.theme).toBeNull();

  // Agora de verdade: Delicado + Lavanda + computador + logo.
  await page.getByRole("button", { name: "Ver o tema Delicado" }).click();
  await dialog.getByRole("button", { name: "Computador" }).click();
  await dialog.getByRole("button", { name: "Lavanda suave" }).click();
  await expect(frame.locator("section").first()).toHaveCSS(
    "background-color",
    "rgb(248, 245, 253)",
  );
  await dialog.getByRole("tab", { name: "Logo" }).click();
  await dialog.getByLabel("Subir logo").setInputFiles("tests/e2e/fixtures/logo-grande.png");
  await dialog.getByRole("button", { name: "Salvar logo" }).click();
  await expect(frame.getByRole("img", { name: "Logo da Barbearia do Zé" }).first()).toBeVisible({
    timeout: 20_000,
  });
  await dialog.getByRole("button", { name: "Usar este tema" }).click();
  await expect(page.getByText("Visual salvo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver o tema Delicado (em uso)" })).toBeVisible();

  await page.goto("http://barbearia-do-ze.localhost:3000/");
  await expect(page.locator("[data-template]")).toHaveAttribute("data-template", "delicado");
  await expect(page.locator("section").first()).toHaveCSS("background-color", "rgb(248, 245, 253)");
  await expect(page.getByRole("img", { name: "Logo da Barbearia do Zé" }).first()).toBeVisible();
});

test("galeria usável em 390 px e pelo teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsZe(page, "/negocio/aparencia/temas");
  const card = page.getByRole("button", { name: "Ver o tema Clínico" });
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Prévia do tema Clínico" })).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scroll).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "Usar este tema" })).toBeInViewport();
});

test("segmento ordena a galeria com selo e 'Surpreenda-me' abre um tema (CAL-149)", async ({
  page,
}) => {
  await loginAsZe(page, "/negocio/aparencia/temas");
  // Barbearia: Noturno e Retrô são indicados.
  const first = page.getByRole("list", { name: "Temas" }).getByRole("button").first();
  await expect(first).toContainText("Combina com Barbearia");
  await page.getByRole("button", { name: "✨ Surpreenda-me" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const tpl = await page
    .frameLocator('iframe[title^="Prévia da página"]')
    .locator("[data-template]")
    .getAttribute("data-template");
  expect(["noturno", "retro"]).toContain(tpl);
});
