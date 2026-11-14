import { expect, test } from "@playwright/test";
import { admin, loginAsZe, seededDay, ZE_BIZ } from "./helpers";

test.afterAll(async () => {
  await admin.from("time_blocks").delete().eq("business_id", ZE_BIZ).eq("reason", "Teste E2E");
});

test("bloqueia um horário, ele some dos livres, e remove", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/?data=${day}`);
  await page.getByRole("link", { name: "Bloquear" }).click();
  await expect(page.getByRole("heading", { name: "Bloquear horário" })).toBeVisible();
  await page.getByLabel("Quem").selectOption({ label: "Zé Carlos" });
  await page.getByLabel("Das").fill("13:00");
  await page.getByLabel("Às").fill("14:00");
  await page.getByLabel("Motivo (opcional)").fill("Teste E2E");
  await page.getByRole("button", { name: "Bloquear", exact: true }).click();
  await expect(page.getByText("Horário bloqueado.")).toBeVisible();
  await expect(page.getByLabel("Próximos bloqueios")).toContainText("Teste E2E");

  await page.goto(`/?data=${day}&profissional=0d000000-0000-4000-8000-000000000001`);
  const timeline = page.getByRole("list", { name: "Linha do tempo do dia" });
  await expect(timeline.getByText(/Bloqueado até 14:00/)).toBeVisible();

  await page.goto(`/bloquear?data=${day}`);
  const item = page
    .getByLabel("Próximos bloqueios")
    .getByRole("listitem")
    .filter({ hasText: "Teste E2E" });
  await item.getByRole("button", { name: "Remover" }).click();
  await expect(page.getByLabel("Próximos bloqueios")).not.toContainText("Teste E2E");
});

test("avisa quando há agendamentos no período", async ({ page }) => {
  const day = await seededDay();
  await loginAsZe(page, `/bloquear?data=${day}`);
  await page.getByLabel("Das").fill("09:00");
  await page.getByLabel("Às").fill("10:00");
  await page.getByLabel("Motivo (opcional)").fill("Teste E2E");
  await page.getByRole("button", { name: "Bloquear", exact: true }).click();
  await expect(page.getByText(/Atenção: há \d agendamento/)).toBeVisible();
});
