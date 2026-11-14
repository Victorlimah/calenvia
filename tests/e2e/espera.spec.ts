import { expect, test } from "./fixtures";
import { admin, flowReady, loginAsZe } from "./helpers";

const PHONE = "5585977770011";
const reset = () => admin.from("waitlist_entries").delete().eq("customer_whatsapp", PHONE);
test.beforeEach(reset);
test.afterAll(reset);

test("cliente entra na lista de espera e o dono avisa pela agenda", async ({ page }) => {
  await page.goto("http://barbearia-do-ze.localhost:3000/agendar");
  await flowReady(page);
  await page.getByRole("radio", { name: /Corte masculino/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: /Entrar na lista de espera/ }).click();
  const date = await page.getByLabel("Dia que você quer").inputValue();
  await page.getByLabel("Período").selectOption("afternoon");
  await page.getByLabel("Seu nome").fill("Espera Teste");
  await page.getByLabel("Seu WhatsApp (espera)").fill("85977770011");
  await page.getByRole("button", { name: "Me avise se abrir vaga" }).click();
  await expect(page.getByText(/Você está na lista de espera/)).toBeVisible();

  const { data } = await admin
    .from("waitlist_entries")
    .select("desired_date, period, status")
    .eq("customer_whatsapp", PHONE)
    .single();
  expect(data).toEqual({ desired_date: date, period: "afternoon", status: "waiting" });

  await loginAsZe(page, `/?data=${date}`);
  const section = page.getByRole("region", { name: /Lista de espera/ });
  await expect(section).toContainText("Espera Teste");
  await expect(section).toContainText("Tarde");
  const link = section.getByRole("link", { name: "Avisar no WhatsApp" });
  const href = decodeURIComponent((await link.getAttribute("href"))!);
  expect(href).toContain("https://wa.me/5585977770011?text=Olá, Espera!");
  expect(href).toContain(`data=${date}`);
  await section.getByRole("button", { name: /Remover Espera Teste/ }).click();
  await expect(page.getByRole("region", { name: /Lista de espera/ })).toHaveCount(0);
});
