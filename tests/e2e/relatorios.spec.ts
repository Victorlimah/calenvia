import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe, ZE_BIZ } from "./helpers";

const PHONE = "5585944440033";
async function cleanup() {
  await cleanupCustomer(PHONE);
  await admin.from("businesses").update({ plan: "pro" }).eq("id", ZE_BIZ);
}
test.beforeEach(cleanup);
test.afterAll(cleanup);

test("relatórios: Pro vê o convite; Pro+ vê faturamento e faltas do mês", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "09:30");
  await admin
    .from("appointments")
    .update({ status: "completed", price_cents: 12345 })
    .eq("id", appt.id);
  const mes = appt.day.slice(0, 7);

  await loginAsZe(page, `/relatorios?mes=${mes}`);
  await expect(page.getByText("Relatórios fazem parte do plano Pro+")).toBeVisible();

  await admin.from("businesses").update({ plan: "pro_plus" }).eq("id", ZE_BIZ);
  await page.reload();
  await expect(page.getByRole("region", { name: "Resumo do mês" })).toContainText("Faturado");
  await expect(page.getByRole("region", { name: "Por serviço" })).toContainText("Corte masculino");
  await expect(page.getByRole("heading", { name: "Melhores clientes" })).toBeVisible();
  await expect(page.getByText(/R\$ 123,45/).first()).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
});
