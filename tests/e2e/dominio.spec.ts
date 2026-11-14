import { expect, test } from "./fixtures";
import { admin, loginAsZe, ZE_BIZ } from "./helpers";

const DOMAIN = "agenda.barbeariadoze-teste.com";
const OTHER = "nao-cadastrado-teste.com";

test.use({
  launchOptions: {
    args: [`--host-resolver-rules=MAP ${DOMAIN} 127.0.0.1, MAP ${OTHER} 127.0.0.1`],
  },
});

async function cleanup() {
  await admin.from("custom_domains").delete().eq("business_id", ZE_BIZ);
  await admin.from("businesses").update({ plan: "pro" }).eq("id", ZE_BIZ);
}
test.beforeEach(cleanup);
test.afterAll(cleanup);

test("Pro não tem domínio próprio; Pro+ cadastra e vê as instruções de DNS", async ({ page }) => {
  await loginAsZe(page, "/ajustes/dominio");
  await expect(page.getByText("Domínio próprio faz parte do plano Pro+.")).toBeVisible();

  await admin.from("businesses").update({ plan: "pro_plus" }).eq("id", ZE_BIZ);
  await page.reload();
  await page.getByLabel("Seu domínio").fill(`https://${DOMAIN}/`);
  await page.getByRole("button", { name: "Usar este domínio" }).click();
  // DNS de teste não existe: fica aguardando e mostra o registro a criar
  await expect(page.getByText("Aguardando DNS")).toBeVisible();
  await expect(page.getByText("cname.vercel-dns.com")).toBeVisible();
  const { data } = await admin
    .from("custom_domains")
    .select("domain, verified_at")
    .eq("business_id", ZE_BIZ)
    .single();
  expect(data).toEqual({ domain: DOMAIN, verified_at: null });
});

test("domínio verificado abre a página do negócio; desconhecido dá 404", async ({ page }) => {
  await admin.from("businesses").update({ plan: "pro_plus" }).eq("id", ZE_BIZ);
  await admin
    .from("custom_domains")
    .insert({ business_id: ZE_BIZ, domain: DOMAIN, verified_at: new Date().toISOString() });
  const unknown = await page.goto(`http://${OTHER}:3000/`);
  expect(unknown?.status()).toBe(404);

  await page.goto(`http://${DOMAIN}:3000/`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page).toHaveTitle(/Barbearia do Zé/);
  await page.goto(`http://${DOMAIN}:3000/agendar`);
  await expect(page.getByRole("radio", { name: /Corte masculino/ })).toBeVisible();
});
