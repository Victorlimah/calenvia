import { expect, test } from "./fixtures";
import { admin, ANA_BIZ, loginAsAna } from "./helpers";

const reset = () => admin.from("businesses").update({ message_texts: {} }).eq("id", ANA_BIZ);
test.beforeEach(reset);
test.afterAll(reset);

test("Básico personaliza a confirmação e o WhatsApp abre com o texto novo", async ({ page }) => {
  await loginAsAna(page, "/ajustes/mensagens");
  const box = page.getByLabel("Confirmação");
  await expect(box).toHaveValue(/Olá, \{nome\}!/);
  await box.fill("Oi {nome}! Seu horário na {negocio} é {dia} às {hora}. Beijos!");
  await expect(page.getByText(/Oi Lucas! Seu horário na Ana Nails é/)).toBeVisible();

  await box.fill("Oi {cliente}");
  await expect(page.getByText("Variável desconhecida: {cliente}.")).toBeVisible();
  await box.fill("Oi {nome}! Seu horário na {negocio} é {dia} às {hora}. Beijos!");
  await page.getByRole("button", { name: "Salvar mensagens" }).click();
  await expect(page.getByText("Mensagens salvas.")).toBeVisible();

  const { data: appt } = await admin
    .from("appointments")
    .select("id")
    .eq("business_id", ANA_BIZ)
    .eq("status", "confirmed")
    .limit(1)
    .single();
  await page.goto(`/agendamento/${appt!.id}`);
  const link = page.getByRole("link", { name: /Enviar confirmação no WhatsApp/ });
  const href = decodeURIComponent((await link.getAttribute("href"))!);
  expect(href).toContain("Seu horário na Ana Nails é");
  expect(href).toContain("Beijos!");
});
