import { expect, test } from "./fixtures";
import { admin, loginAsZe, SIGNUP_OPEN, ZE_BIZ } from "./helpers";

// A indicação leva ao cadastro aberto; no modo convite (padrão) não há cadastro.
test.skip(!SIGNUP_OPEN, "Só com SIGNUP_MODE=open");

test("indicação: link do site leva ao cadastro e o indicado aparece para quem indicou", async ({
  page,
  browser,
}) => {
  await loginAsZe(page, "/indicar");
  const link = (await page.getByTestId("ref-link").textContent())!.trim();
  expect(link).toMatch(/\?ref=[a-z2-9]{8}$/);
  const code = link.split("ref=")[1];

  // Visitante chega pelo link e escolhe um plano
  const visitor = await browser.newPage();
  await visitor.goto(link);
  await expect(visitor.getByRole("link", { name: "Escolher Pro", exact: true })).toHaveAttribute(
    "href",
    new RegExp(`plano=pro&ref=${code}`),
  );
  await visitor.getByRole("link", { name: "Escolher Pro", exact: true }).click();
  const stamp = Date.now();
  await visitor.getByLabel("Seu nome").fill("Indicada Teste");
  await visitor.getByLabel("E-mail").fill(`indicada+${stamp}@calenvia.dev`);
  await visitor.getByLabel("Senha").fill("senhaforte123");
  await visitor.getByRole("button", { name: "Criar conta" }).click();
  await expect(visitor).toHaveURL(/\/onboarding/, { timeout: 45_000 }); // cadastro pode demorar no modo dev
  await visitor.getByLabel("Nome do negócio").fill(`Indicada ${stamp}`);
  await visitor.getByLabel("Tipo de negócio").selectOption("estetica");
  await visitor.getByLabel("WhatsApp do negócio").fill("85999997777");
  await visitor
    .getByLabel("Endereço", { exact: true })
    .fill("Rua das Flores, 10 — Centro, Fortaleza/CE");
  await expect(visitor.getByText("Disponível:")).toBeVisible();
  await visitor.getByRole("button", { name: "Continuar" }).click();
  await expect(visitor).toHaveURL(/\/onboarding\/servicos/);

  const { data } = await admin
    .from("businesses")
    .select("referred_by, referral_code")
    .eq("name", `Indicada ${stamp}`)
    .single();
  expect(data!.referred_by).toBe(ZE_BIZ);
  expect(data!.referral_code).toMatch(/^[a-z2-9]{8}$/);

  await page.reload();
  await expect(page.getByText(`Indicada ${stamp}`)).toBeVisible();
  await visitor.close();
});
