import { expect, test } from "./fixtures";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

const NOTE = "e2e-registrar";

test.afterEach(async () => {
  await admin.from("appointments").delete().eq("business_id", ZE_BIZ).eq("notes", NOTE);
});

test("registra atendimento de quem chegou sem marcar e ele entra como concluído", async ({
  page,
}) => {
  await loginAsZe(page, "/registrar");
  await expect(page.getByRole("heading", { name: "Registrar atendimento" })).toBeVisible();
  // O dia não aceita data futura.
  await expect(page.getByLabel("Dia")).toHaveAttribute("max", /\d{4}-\d{2}-\d{2}/);

  // Em dev, a primeira visita compila a rota: repete até a página hidratar.
  await expect(async () => {
    await page.getByLabel("Nome do cliente").fill("");
    await page.getByLabel("Nome do cliente").fill("Cliente de Balcão");
    await expect(page.getByLabel("Nome do cliente")).toHaveValue("Cliente de Balcão");
  }).toPass();
  await page.getByLabel("Hora").fill("07:00");
  await page.getByLabel("Valor cobrado (R$)").fill("42,50");
  await page.getByLabel("Observações (opcional)").fill(NOTE);
  await page.getByRole("button", { name: "Registrar atendimento" }).click();

  await expect(page).toHaveURL(/\/agendamento\//);
  await expect(page.getByText("Cliente de Balcão").first()).toBeVisible();
  await expect(page.getByText("Concluído").first()).toBeVisible();
  await expect(page.getByText("Sem WhatsApp").first()).toBeVisible();
});
