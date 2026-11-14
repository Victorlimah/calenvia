import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe, ZE_BIZ } from "./helpers";

const PHONE = "5585944440012";
async function cleanup() {
  await cleanupCustomer(PHONE);
  await admin.from("businesses").update({ calendar_token: null }).eq("id", ZE_BIZ);
}
test.beforeEach(cleanup);
test.afterAll(cleanup);

test("gera o link privado e o feed traz os agendamentos", async ({ page, request }) => {
  await createTestAppointment(PHONE, "15:30");
  await loginAsZe(page, "/ajustes/google-agenda");
  await page.getByRole("button", { name: "Gerar link da agenda" }).click();
  const feed = page.getByTestId("feed-url");
  await expect(feed).toContainText("/api/calendario/");
  const url = (await feed.textContent())!.trim();

  const res = await request.get(url);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  const ics = await res.text();
  expect(ics).toContain("X-WR-CALNAME:Barbearia do Zé · Calenvia");
  expect(ics).toContain("Corte masculino · Cliente Detalhe");

  // gerar novo link invalida o anterior
  await page.getByRole("button", { name: "Gerar novo link" }).click();
  await expect(page.getByText(/O anterior parou de funcionar/)).toBeVisible();
  expect((await request.get(url)).status()).toBe(404);
});
