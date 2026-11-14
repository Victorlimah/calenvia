import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe } from "./helpers";

const PHONE = "5585944440088";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

function nextWednesday() {
  const tz = "America/Fortaleza";
  const d = new Date(Date.now() + 10 * 86400000);
  while (new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d) !== "Wed")
    d.setTime(d.getTime() + 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
}

test("agenda mostra agendamento novo e cancelamento sem recarregar", async ({ page }) => {
  const day = nextWednesday();
  await loginAsZe(page, `/?data=${day}`);
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  await expect(page.getByText("Cliente Detalhe")).toHaveCount(0);
  // dá tempo do canal do Realtime conectar
  await page.waitForTimeout(1500);

  const appt = await createTestAppointment(PHONE, "15:00");
  expect(appt.day).toBe(day);
  await expect(page.getByText("Cliente Detalhe")).toBeVisible({ timeout: 10_000 });

  await admin
    .from("appointments")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", appt.id);
  await expect(page.getByRole("link", { name: /Cliente Detalhe/ })).toHaveCount(0, {
    timeout: 10_000,
  });
});
