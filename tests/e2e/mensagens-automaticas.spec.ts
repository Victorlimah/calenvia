import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import {
  admin,
  cleanupCustomer,
  createTestAppointment,
  loginAsAna,
  loginAsZe,
  ZE_BIZ,
} from "./helpers";

const PHONE = "5585933330099";
const resetSettings = () =>
  admin
    .from("business_message_settings")
    .update({
      confirmation_enabled: true,
      reminder_enabled: true,
      reminder_offsets_min: [120],
      cancellation_enabled: true,
    })
    .eq("business_id", ZE_BIZ);
test.beforeEach(async () => {
  await resetSettings();
  await cleanupCustomer(PHONE);
});
test.afterAll(async () => {
  await resetSettings();
  await cleanupCustomer(PHONE);
});

test("Pro: estimativa da cota, 24 h + 2 h e confirmação desligada vira skipped", async ({
  page,
}) => {
  await loginAsZe(page, "/ajustes/mensagens-automaticas");
  await expect(page.getByTestId("quota-usage")).toContainText("de 300 mensagens usadas");
  await expect(page.getByTestId("quota-estimate")).toContainText(
    "atende cerca de 150 agendamentos",
  );

  await page.getByRole("checkbox", { name: "24 horas antes" }).check();
  await expect(page.getByTestId("quota-estimate")).toContainText("cerca de 100 agendamentos");
  await page.getByRole("switch", { name: /Confirmação ao agendar/ }).uncheck();
  await expect(page.getByTestId("quota-estimate")).toContainText("cerca de 150 agendamentos");
  await page.getByText("Ver o texto da mensagem").first().click();
  await expect(page.getByText(/Olá, Lucas! Aqui é da \*Barbearia do Zé\*/)).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Ajustes de mensagens salvos.")).toBeVisible();

  const { data: saved } = await admin
    .from("business_message_settings")
    .select("confirmation_enabled, reminder_offsets_min, updated_by")
    .eq("business_id", ZE_BIZ)
    .single();
  expect(saved).toMatchObject({ confirmation_enabled: false, reminder_offsets_min: [1440, 120] });
  expect(saved!.updated_by).toBeTruthy();

  // Novo agendamento manual: confirmação não sai, fica como skipped e o botão do wa.me aparece
  const tz = "America/Fortaleza";
  const d = new Date(Date.now() + 9 * 86400000);
  while (new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d) !== "Wed")
    d.setTime(d.getTime() + 86400000);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  await page.goto(`/novo?data=${day}`);
  await page.getByLabel("Serviço").selectOption({ label: "Pezinho · 15 min · R$ 15,00" });
  const slots = page.getByRole("list", { name: "Horários livres" }).getByRole("button");
  await expect(slots.first()).toBeVisible();
  await slots.last().click();
  await page.getByLabel("Nome do cliente").fill("Skip Teste");
  await page.getByLabel("WhatsApp do cliente").fill("85933330099");
  await page.getByRole("button", { name: "Agendar", exact: true }).click();
  await expect(page).toHaveURL(/\/agendamento\/.+\?enviar=1/);
  await expect(page.getByText(/Confirmação · automática/)).toBeVisible();
  await expect(page.getByText(/Não enviada \(desligada nos ajustes\)/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Enviar confirmação no WhatsApp/ })).toBeVisible();
});

test("detalhe: desligar as mensagens deste agendamento", async ({ page }) => {
  const appt = await createTestAppointment(PHONE, "13:30");
  await loginAsZe(page, `/agendamento/${appt.id}`);
  await page
    .getByRole("checkbox", { name: /Não enviar mensagens automáticas para este agendamento/ })
    .check();
  await expect(
    page.getByText("Este agendamento não vai receber mensagens automáticas."),
  ).toBeVisible();
  const { data } = await admin
    .from("appointments")
    .select("messages_enabled")
    .eq("id", appt.id)
    .single();
  expect(data!.messages_enabled).toBe(false);
});

test("Básico: controles bloqueados com 'Disponível no Pro'", async ({ page }) => {
  await loginAsAna(page, "/ajustes/mensagens-automaticas");
  await expect(page.getByText("Disponível no Pro")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver planos" })).toHaveAttribute(
    "href",
    "/assinatura",
  );
  await expect(page.getByRole("switch", { name: /Confirmação ao agendar/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Salvar" })).toHaveCount(0);
});
