import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, createTestAppointment } from "./helpers";

const PHONE = "5585944440077";
const ZE = "http://barbearia-do-ze.localhost:3000";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("cliente remarca pelo link e depois cancela", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "10:00");
  await page.goto(`${ZE}/gerenciar/${appt.code}`);
  await expect(page.getByRole("heading", { name: "Seu agendamento" })).toBeVisible();
  await expect(page.getByText(/Você pode remarcar ou cancelar até/)).toBeVisible();

  await page.getByRole("button", { name: "Remarcar" }).click();
  // um dia mais à frente: remarcar para hoje cairia dentro do prazo de cancelamento
  const days = page.getByRole("list", { name: "Dias" }).getByRole("button", { disabled: false });
  await expect(days.first()).toBeVisible();
  await days.last().click();
  const slots = page.locator('[aria-label^="Horários da"] button');
  await expect(slots.first()).toBeVisible();
  await slots.last().click();
  await page.getByRole("button", { name: "Confirmar novo horário" }).click();
  await expect(page).toHaveURL(new RegExp(`/confirmado/${appt.code}$`));
  await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
  const { data: moved } = await admin
    .from("appointments")
    .select("starts_at, status")
    .eq("id", appt.id)
    .single();
  expect(moved!.status).toBe("confirmed");
  expect(new Date(moved!.starts_at).getTime()).not.toBe(
    new Date(`${appt.day}T10:00:00-03:00`).getTime(),
  );

  await page.goto(`${ZE}/gerenciar/${appt.code}`);
  await page.getByRole("button", { name: "Cancelar agendamento" }).click();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Agendamento cancelado" })).toBeVisible();

  await page.goto(`${ZE}/gerenciar/${appt.code}`);
  await expect(page.getByText("Este agendamento já foi cancelado.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Agendar de novo" })).toBeVisible();
});

test("depois do prazo, o link manda falar com o negócio", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "11:00");
  // daqui a 1 hora: o prazo do Zé (2 h antes) já passou
  const soon = new Date(Date.now() + 60 * 60 * 1000);
  await admin
    .from("appointments")
    .update({
      starts_at: soon.toISOString(),
      ends_at: new Date(soon.getTime() + 30 * 60 * 1000).toISOString(),
    })
    .eq("id", appt.id);
  await page.goto(`${ZE}/gerenciar/${appt.code}`);
  await expect(page.getByText(/O prazo para remarcar ou cancelar pelo link era até/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Falar no WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/5585988887777\?text=/,
  );
  await expect(page.getByRole("button", { name: "Remarcar" })).toHaveCount(0);
});

test("código inexistente mostra 404", async ({ page }) => {
  const res = await page.goto(`${ZE}/gerenciar/ZZZZZZ`);
  expect(res?.status()).toBe(404);
});
