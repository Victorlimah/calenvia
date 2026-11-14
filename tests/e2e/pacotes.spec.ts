import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe, ZE_BIZ } from "./helpers";

const PHONE = "5585944440022";
async function cleanup() {
  const { data: c } = await admin
    .from("customers")
    .select("id")
    .eq("whatsapp", PHONE)
    .maybeSingle();
  if (c) await admin.from("customer_packages").delete().eq("customer_id", c.id);
  await cleanupCustomer(PHONE);
  await admin.from("service_packages").delete().eq("business_id", ZE_BIZ).like("name", "E2E%");
  await admin
    .from("finance_entries")
    .delete()
    .eq("business_id", ZE_BIZ)
    .like("description", "E2E%");
}
test.beforeEach(cleanup);
test.afterAll(cleanup);

test("cria pacote, vende ao cliente e desconta no agendamento", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "11:30");
  await loginAsZe(page, "/ajustes/pacotes");
  await page.getByLabel("Serviço").selectOption({ label: "Corte masculino (R$ 40,00)" });
  await page.getByLabel("Nome do pacote").fill("E2E 4 cortes");
  await page.getByLabel("Sessões").fill("4");
  await page.getByLabel("Preço (R$)").fill("140");
  await expect(page.getByText(/economiza R\$ 20,00/)).toBeVisible();
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText("Pacote criado.")).toBeVisible();

  const { data: c } = await admin.from("customers").select("id").eq("whatsapp", PHONE).single();
  await page.goto(`/clientes/${c!.id}`);
  await page.getByLabel("Vender pacote").selectOption({ label: "E2E 4 cortes · R$ 140,00" });
  await page.getByRole("button", { name: "Vender" }).click();
  await expect(page.getByText("Pacote “E2E 4 cortes” vendido.")).toBeVisible();
  await expect(page.getByText(/4 de 4 restantes/)).toBeVisible();

  await page.goto(`/agendamento/${appt.id}`);
  await page
    .getByRole("button", { name: /Descontar do pacote “E2E 4 cortes” \(4 restantes\)/ })
    .click();
  await expect(page.getByText("Pago com o pacote “E2E 4 cortes”.")).toBeVisible();

  const { data: cp } = await admin
    .from("customer_packages")
    .select("sessions_used")
    .eq("customer_id", c!.id)
    .single();
  expect(cp!.sessions_used).toBe(1);
  const { data: fin } = await admin
    .from("finance_entries")
    .select("category, amount_cents")
    .eq("business_id", ZE_BIZ)
    .eq("description", "E2E 4 cortes")
    .single();
  expect(fin).toEqual({ category: "Venda de pacote", amount_cents: 14000 });
});
