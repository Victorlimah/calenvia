import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe } from "./helpers";

const PHONE = "5585944440055";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("dono recebe aviso quando o cliente agenda pela página", async ({ page, context }) => {
  await context.grantPermissions(["notifications"], { origin: "http://app.localhost:3000" });
  await loginAsZe(page, "/ajustes");
  await expect(page.getByText("Avisos ligados neste aparelho.")).toBeVisible();
  await page.waitForTimeout(1500); // canal do Realtime conectando

  // agendamento manual não gera aviso
  const manual = await createTestAppointment(PHONE, "08:30");
  // agendamento pela página gera aviso
  const viaLink = await createTestAppointment(PHONE, "18:00");
  await admin.from("appointments").delete().eq("id", viaLink.id);
  const { data } = await admin
    .from("appointments")
    .insert({
      business_id: "0b000000-0000-4000-8000-000000000001",
      customer_id: (await admin.from("customers").select("id").eq("whatsapp", PHONE).single()).data!
        .id,
      service_id: "0c000000-0000-4000-8000-000000000001",
      staff_member_id: "0d000000-0000-4000-8000-000000000001",
      starts_at: new Date(`${viaLink.day}T18:00:00-03:00`).toISOString(),
      ends_at: new Date(`${viaLink.day}T18:30:00-03:00`).toISOString(),
      customer_name: "Aviso Teste",
      customer_whatsapp: PHONE,
      source: "link",
    })
    .select("id")
    .single();

  const toast = page.getByRole("status").filter({ hasText: "Novo agendamento" });
  await expect(toast).toBeVisible({ timeout: 10_000 });
  await expect(toast).toContainText("Aviso Teste");
  await expect(toast).toContainText("às 18:00");
  await expect(page.getByText("Cliente Detalhe")).toHaveCount(0); // o manual não avisou
  await toast.getByRole("link", { name: "Ver agendamento" }).click();
  await expect(page).toHaveURL(new RegExp(`/agendamento/${data!.id}`));
  expect(manual.id).toBeTruthy();
});
