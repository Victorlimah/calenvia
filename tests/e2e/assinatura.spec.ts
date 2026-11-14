import { expect, test } from "./fixtures";
import { admin, cleanupCustomer, loginAsZe, ZE_BIZ, seededDay } from "./helpers";

// Barbearia do Zé é Pro (300 mensagens/mês), fuso de Fortaleza.
const PERIOD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Fortaleza",
  year: "numeric",
  month: "2-digit",
})
  .format(new Date())
  .slice(0, 7);
const PHONE = "5585933330077";
let original: number | null = null;

async function setUsage(count: number) {
  await admin
    .from("message_usage")
    .upsert({ business_id: ZE_BIZ, period: PERIOD, count }, { onConflict: "business_id,period" });
}

test.beforeAll(async () => {
  const { data } = await admin
    .from("message_usage")
    .select("count")
    .eq("business_id", ZE_BIZ)
    .eq("period", PERIOD)
    .maybeSingle();
  original = data?.count ?? null;
  await cleanupCustomer(PHONE);
});

test.afterAll(async () => {
  await cleanupCustomer(PHONE);
  if (original === null)
    await admin.from("message_usage").delete().eq("business_id", ZE_BIZ).eq("period", PERIOD);
  else await setUsage(original);
});

test("assinatura mostra o plano e o uso de mensagens do mês", async ({ page }) => {
  await setUsage(120);
  await loginAsZe(page, "/assinatura");
  await expect(page.getByRole("heading", { name: "Plano Pro" })).toBeVisible();
  await expect(page.getByText("120 de 300 mensagens")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "120");
  await expect(page.getByText("Seu plano atual")).toBeVisible();
});

test("perto do limite, a agenda avisa e sugere o Pro+", async ({ page }) => {
  await setUsage(250);
  await loginAsZe(page, "/");
  const alert = page.getByRole("status").filter({ hasText: "Restam 50 mensagens" });
  await expect(alert).toBeVisible();
  await alert.getByRole("link", { name: "Ver o plano Pro+" }).click();
  await expect(page).toHaveURL(/\/assinatura$/);
});

test("cota esgotada: agendamento manual continua e a confirmação vai pelo wa.me", async ({
  page,
}) => {
  await setUsage(300);
  await loginAsZe(page, "/");
  await expect(page.getByText("As mensagens automáticas do mês acabaram")).toBeVisible();

  // Dia com o negócio aberto (hoje pode já ter fechado, ex.: sábado à noite).
  await page.goto(`/novo?data=${await seededDay()}`);
  await page.getByLabel("Serviço").selectOption({ label: "Pezinho · 15 min · R$ 15,00" });
  const slots = page.getByRole("list", { name: "Horários livres" }).getByRole("button");
  await expect(slots.first()).toBeVisible();
  await slots.last().click();
  await page.getByLabel("Nome do cliente").fill("Cota Teste");
  await page.getByLabel("WhatsApp do cliente").fill("85933330077");
  await page.getByRole("button", { name: "Agendar", exact: true }).click();
  await expect(page).toHaveURL(/\/agendamento\/.+\?enviar=1/);
  await expect(page.getByRole("link", { name: /Enviar confirmação no WhatsApp/ })).toBeVisible();

  const { data } = await admin
    .from("message_usage")
    .select("count")
    .eq("business_id", ZE_BIZ)
    .eq("period", PERIOD)
    .single();
  expect(data?.count).toBe(300);
});
