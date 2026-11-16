import { expect, test } from "./fixtures";
import { admin, loginAsZe } from "./helpers";

const RAFAEL = "0d000000-0000-4000-8000-000000000002";
const reset = () => admin.from("staff_hours").delete().eq("staff_member_id", RAFAEL);
test.beforeEach(reset);
test.afterAll(reset);

test("horário próprio do profissional: folga muda a página pública", async ({ page }) => {
  await loginAsZe(page, "/negocio/equipe");
  await page.getByRole("link", { name: "Horário de Rafael Lima" }).click();
  await expect(page).toHaveURL(new RegExp(`/negocio/equipe/${RAFAEL}/horario`), {
    timeout: 45_000,
  });
  await expect(page.getByRole("heading", { name: "Horário de Rafael Lima" })).toBeVisible();
  await page.getByRole("radio", { name: /Horário próprio/ }).check();
  // Rafael folga às quartas
  await page.getByRole("switch").nth(2).uncheck();
  await expect(page.getByRole("button", { name: /\+ Intervalo/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Salvar horário próprio" }).click();
  await expect(page.getByText("Horário próprio salvo.")).toBeVisible();

  const { data } = await admin
    .from("staff_hours")
    .select("weekday, is_open")
    .eq("staff_member_id", RAFAEL)
    .order("weekday");
  expect(data).toHaveLength(7);
  expect(data!.find((d) => d.weekday === 3)?.is_open).toBe(false);

  await page.goto("/negocio/equipe");
  await expect(page.getByText("Horário próprio")).toBeVisible();

  await page.goto(`/negocio/equipe/${RAFAEL}/horario`);
  await page.getByRole("radio", { name: /Mesmo horário do negócio/ }).check();
  await page.getByRole("button", { name: "Voltar ao horário do negócio" }).click();
  await expect(page.getByText("Agora segue o horário do negócio.")).toBeVisible();
  const { count } = await admin
    .from("staff_hours")
    .select("id", { count: "exact", head: true })
    .eq("staff_member_id", RAFAEL);
  expect(count).toBe(0);
});
