import { expect, test } from "./fixtures";
import { axeViolations } from "./a11y";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

async function cleanup() {
  await admin.from("support_requests").delete().eq("business_id", ZE_BIZ);
  await admin.from("businesses").update({ plan: "pro" }).eq("id", ZE_BIZ);
}
test.beforeEach(cleanup);
test.afterAll(cleanup);

test("ajuda: dúvidas e pedido de suporte (Pro+ prioritário)", async ({ page }) => {
  await admin.from("businesses").update({ plan: "pro_plus" }).eq("id", ZE_BIZ);
  await loginAsZe(page, "/ajuda");
  await expect(page.getByText("Suporte prioritário")).toBeVisible();
  await expect(page.getByText(/até 4 horas úteis/)).toBeVisible();
  await page.getByText("Vou tirar folga ou sair mais cedo").click();
  await expect(page.getByText(/toque em Bloquear/)).toBeVisible();

  await page.getByLabel("Assunto").selectOption("whatsapp");
  await page
    .getByLabel("Como podemos ajudar?")
    .fill("A mensagem não chegou para um cliente ontem.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(/Recebemos seu pedido/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seus pedidos" })).toBeVisible();

  const { data } = await admin
    .from("support_requests")
    .select("topic, priority, status")
    .eq("business_id", ZE_BIZ)
    .single();
  expect(data).toEqual({ topic: "whatsapp", priority: true, status: "open" });
  expect(await axeViolations(page)).toEqual([]);
});
