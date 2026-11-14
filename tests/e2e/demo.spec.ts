import { expect, test } from "@playwright/test";

test("site leva à demonstração, que avisa ser fictícia", async ({ page, request }) => {
  const reset = await request.get("http://localhost:3000/api/cron/demo-reset", {
    headers: { authorization: "Bearer dev-cron-secret" },
  });
  expect(reset.status()).toBe(200);

  await page.goto("http://localhost:3000");
  await page.getByRole("link", { name: "Ver uma demonstração" }).click();
  await expect(page).toHaveURL("http://demo.localhost:3000/");
  await expect(page.getByRole("note")).toContainText("Demonstração da Calenvia");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Experimente agendar");
  await page.getByRole("link", { name: "Agendar meu horário" }).first().click();
  await expect(page.getByRole("radio", { name: /Manicure/ })).toBeVisible();
});

test("cron da demo exige o segredo", async ({ request }) => {
  const r = await request.get("http://localhost:3000/api/cron/demo-reset");
  expect(r.status()).toBe(401);
});
