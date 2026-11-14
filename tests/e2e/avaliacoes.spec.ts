import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import { admin, cleanupCustomer, createTestAppointment, loginAsZe } from "./helpers";

const PHONE = "5585944440011";
const ZE = "http://barbearia-do-ze.localhost:3000";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("dono pede avaliação, cliente avalia e o dono publica na página", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "12:00");
  await admin.from("appointments").update({ status: "completed" }).eq("id", appt.id);

  await loginAsZe(page, `/agendamento/${appt.id}`);
  const ask = page.getByRole("link", { name: "Pedir avaliação no WhatsApp" });
  const href = decodeURIComponent((await ask.getAttribute("href"))!);
  expect(href).toContain(`/avaliar/${appt.code}`);

  await page.goto(`${ZE}/avaliar/${appt.code}`);
  await expect(page.getByRole("heading", { name: /Como foi na Barbearia do Zé/ })).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("radio", { name: /5 estrelas/ }).check({ force: true });
  await page.getByLabel("Quer contar mais? (opcional)").fill("Corte impecável, recomendo demais!");
  await page.getByRole("button", { name: "Enviar avaliação" }).click();
  await expect(page.getByText("Obrigado pela avaliação!")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Você já avaliou este atendimento. Obrigado!")).toBeVisible();

  await page.goto("http://app.localhost:3000/avaliacoes");
  await expect(page.getByText("Corte impecável, recomendo demais!")).toBeVisible();
  await page.getByRole("button", { name: "Mostrar na página" }).first().click();
  await expect(page.getByRole("button", { name: "Tirar da página" }).first()).toBeVisible();

  await page.goto(ZE);
  await expect(page.getByText("Corte impecável, recomendo demais!")).toBeVisible();
  await expect(page.getByText("— Cliente D.")).toBeVisible();
});

test("avaliação de atendimento não concluído é recusada", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "12:30");
  await page.goto(`${ZE}/avaliar/${appt.code}`);
  await expect(page.getByText("Você poderá avaliar depois do atendimento.")).toBeVisible();
});
