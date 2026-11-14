import { expect, test } from "./fixtures";
import { cleanupCustomer, createTestAppointment, loginAsZe } from "./helpers";

const PHONE = "5585944440001";
test.beforeEach(() => cleanupCustomer(PHONE));
test.afterAll(() => cleanupCustomer(PHONE));

test("detalhe: concluir, desfazer, remarcar e cancelar", async ({ page }) => {
  const appt = await createTestAppointment(PHONE);
  await loginAsZe(page, `/agendamento/${appt.id}`);
  await expect(page.getByRole("heading", { name: "Cliente Detalhe" })).toBeVisible();
  await expect(page.getByText("Agendamento manual")).toBeVisible();
  await expect(page.getByRole("link", { name: "Chamar no WhatsApp" })).toHaveAttribute(
    "href",
    `https://wa.me/${PHONE}`,
  );

  await page.getByRole("button", { name: "Concluído" }).click();
  await expect(page.getByText("Marcado como concluído.")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer concluído" }).click();
  await expect(page.getByText("Marcado como confirmado.")).toBeVisible();

  await page.getByRole("button", { name: "Remarcar" }).click();
  const slots = page
    .getByRole("list", { name: "Horários livres para remarcar" })
    .getByRole("button");
  await expect(slots.first()).toBeVisible();
  await slots.filter({ hasText: "14:00" }).click();
  await page.getByRole("button", { name: "Confirmar novo horário" }).click();
  await expect(page.getByText(/14:00–14:30/)).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(page.getByText("Agendamento cancelado. O horário ficou livre.")).toBeVisible();
  await expect(page.getByText("Cancelado", { exact: true }).first()).toBeVisible();
});

test("plano B: enviar confirmação abre o WhatsApp com a mensagem e registra o envio", async ({
  page,
  context,
}) => {
  const appt = await createTestAppointment(PHONE);
  await loginAsZe(page, `/agendamento/${appt.id}`);
  const btn = page.getByRole("link", { name: "Enviar confirmação no WhatsApp" });
  const href = await btn.getAttribute("href");
  expect(href).toContain(`https://wa.me/${PHONE}?text=`);
  expect(decodeURIComponent(href!)).toContain("Olá, Cliente! Aqui é da *Barbearia do Zé*");
  const popup = context.waitForEvent("page");
  await btn.click();
  await (await popup).close();
  await expect(page.getByRole("link", { name: "Reenviar confirmação" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Mensagens", exact: true })).toContainText(
    "Confirmação · pelo seu WhatsApp",
  );
});

test("opt-out: o dono pausa e religa as mensagens automáticas do cliente", async ({ page }) => {
  const appt = await createTestAppointment(PHONE);
  await loginAsZe(page, `/agendamento/${appt.id}`);
  const card = page
    .getByRole("heading", { name: "Mensagens automáticas" })
    .locator("..")
    .locator("..");
  await page.getByRole("button", { name: "Parar de enviar para este cliente" }).click();
  await expect(
    page.getByText("Este cliente não vai mais receber mensagens automáticas."),
  ).toBeVisible();
  await expect(card.getByText(/pediu para não receber/)).toBeVisible();
  await page.getByRole("button", { name: "Voltar a enviar mensagens" }).click();
  await expect(page.getByText("Mensagens automáticas ligadas para este cliente.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Parar de enviar para este cliente" }),
  ).toBeVisible();
});
