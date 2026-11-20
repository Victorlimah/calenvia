import { expect, test } from "./fixtures";
import { admin, loginAsZe } from "./helpers";

// CAL-136/137: o admin convida um negócio e o dono aceita pelo link.
const EMAIL_PREFIX = "convite-e2e";

async function cleanup() {
  const { data } = await admin
    .from("owner_invitations")
    .select("business_id, accepted_by")
    .like("email", `${EMAIL_PREFIX}%`);
  for (const r of data ?? []) {
    await admin.from("businesses").delete().eq("id", r.business_id);
    if (r.accepted_by) await admin.auth.admin.deleteUser(r.accepted_by);
  }
}

test.beforeAll(cleanup);
test.afterAll(cleanup);

async function createInvite(
  page: import("@playwright/test").Page,
  opts: { business: string; email: string; segment?: string },
) {
  await loginAsZe(page, "/admin/convites", "admin@calenvia.dev");
  await expect(page.getByRole("heading", { name: "Convites", exact: true })).toBeVisible();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Criar negócio e gerar convite" }) });
  await form.getByLabel("Nome do negócio").fill(opts.business);
  await form.getByLabel("Segmento", { exact: true }).selectOption(opts.segment ?? "salao");
  await form.getByLabel("Nome do dono").fill("Bela Convidada");
  await form.getByLabel("E-mail do dono").fill(opts.email);
  await form.getByLabel("WhatsApp do negócio").fill("83986479932");
  await form.getByLabel("Plano", { exact: true }).selectOption("pro");
  await form.getByRole("button", { name: "Criar negócio e gerar convite" }).click();
  const card = page.getByTestId("invite-link-card");
  await expect(card).toBeVisible({ timeout: 20_000 });
  const link = await card.getByLabel("Link do convite").inputValue();
  expect(link).toMatch(/^http:\/\/app\.localhost:3000\/convite\/[A-Za-z0-9_-]{20,}$/);
  return link;
}

test("admin convida um negócio: cria, copia o link, lista, gera outro e cancela", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const email = `${EMAIL_PREFIX}-${stamp}@calenvia.dev`;
  const business = `Studio Convite ${stamp}`;
  await createInvite(page, { business, email });
  const card = page.getByTestId("invite-link-card");
  await expect(card.getByRole("link", { name: "Enviar pelo WhatsApp" })).toHaveAttribute(
    "href",
    /wa\.me\/5583986479932\?text=/,
  );
  await expect(card.getByRole("link", { name: "Enviar por e-mail" })).toHaveAttribute(
    "href",
    new RegExp(`^mailto:${email}`),
  );

  // Negócio já ativo, com assinatura manual e serviços iniciais do segmento, sem dono.
  const { data: inv } = await admin
    .from("owner_invitations")
    .select("token_hash, business_id, businesses(plan, plan_status, owner_id)")
    .eq("email", email)
    .single();
  expect(inv?.token_hash).toMatch(/^[0-9a-f]{64}$/);
  expect(inv?.businesses).toMatchObject({ plan: "pro", plan_status: "active", owner_id: null });
  const { count } = await admin
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", inv!.business_id);
  expect(count).toBeGreaterThan(0);

  // Lista com o estado "Enviado".
  await page.reload();
  const row = page.getByTestId("owner-invite").filter({ hasText: business });
  await expect(row).toContainText("Enviado");
  await expect(row).toContainText(email);

  // Gerar novo link troca o token.
  await row.getByRole("button", { name: "Gerar novo link" }).click();
  await expect(row.getByTestId("invite-link-card")).toBeVisible();
  const { data: after } = await admin
    .from("owner_invitations")
    .select("token_hash")
    .eq("email", email)
    .single();
  expect(after?.token_hash).not.toBe(inv?.token_hash);

  // Cancelar.
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Cancelar convite" }).click();
  await expect(row).toContainText("Cancelado");
});

test("dono aceita o convite: cria a senha, faz o onboarding e a página fica no ar", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `${EMAIL_PREFIX}-aceite-${stamp}@calenvia.dev`;
  const business = `Espaco Bela ${stamp}`;
  const link = await createInvite(page, { business, email, segment: "manicure" });
  const path = new URL(link).pathname;

  const ctx = await browser.newContext();
  const owner = await ctx.newPage();
  await owner.goto(path);
  await expect(
    owner.getByRole("heading", { name: `Você foi convidado(a) para a ${business}` }),
  ).toBeVisible();
  await expect(owner.getByLabel("E-mail")).toHaveValue(email);
  await expect(owner.getByLabel("E-mail")).toHaveAttribute("readonly", "");
  // Aberto aparece para o admin.
  await page.reload();
  await expect(page.getByTestId("owner-invite").filter({ hasText: business })).toContainText(
    "Aberto",
  );

  await owner.getByLabel("Crie uma senha").fill("senhaforte123");
  await owner.getByLabel("Repita a senha").fill("senhaforte123");
  await owner.getByRole("button", { name: "Criar senha e começar" }).click();
  await expect(owner).toHaveURL(/\/onboarding$/, { timeout: 30_000 });

  // Passo 1 já vem preenchido com os dados do convite: só falta o endereço.
  await expect(owner.getByLabel("Nome do negócio")).toHaveValue(business);
  await owner
    .getByLabel("Endereço", { exact: true })
    .fill("Rua das Flores, 10 — Centro, João Pessoa/PB");
  await owner.getByRole("button", { name: "Continuar" }).click();

  // Passo 2: serviços iniciais do segmento já estão lá.
  await expect(owner).toHaveURL(/\/onboarding\/servicos/);
  await expect(owner.getByText("Manicure", { exact: true }).first()).toBeVisible();
  await owner.getByRole("link", { name: "Continuar" }).click();

  await expect(owner).toHaveURL(/\/onboarding\/profissionais/);
  await owner.getByRole("button", { name: "Eu mesmo atendo" }).click();
  await expect(owner.getByText("Bela Convidada")).toBeVisible();
  await owner.getByRole("link", { name: "Continuar" }).click();

  await expect(owner).toHaveURL(/\/onboarding\/horarios/);
  await owner.getByRole("button", { name: "Salvar e finalizar" }).click();
  // Passo opcional do tema (CAL-148): a galeria aparece, a pessoa pode pular.
  await expect(owner).toHaveURL(/\/onboarding\/tema/);
  await expect(owner.getByRole("button", { name: /Ver o tema Delicado/ })).toBeVisible();
  await owner.getByRole("link", { name: "Pular por enquanto" }).click();
  await expect(owner).toHaveURL(/\/onboarding\/pronto/);
  await expect(owner.getByRole("heading", { name: "Sua página está no ar!" })).toBeVisible();
  await expect(owner.getByRole("link", { name: "Assinar e ativar" })).toHaveCount(0);

  // Página pública no ar.
  const { data: biz } = await admin
    .from("owner_invitations")
    .select("businesses(slug)")
    .eq("email", email)
    .single();
  const slug = (biz?.businesses as unknown as { slug: string } | null)?.slug;
  await owner.goto(`http://${slug}.localhost:3000/`);
  await expect(owner.getByRole("heading", { level: 1 })).toContainText(business);
  await expect(owner.getByRole("link", { name: /Agendar meu horário/ }).first()).toBeVisible();

  // O mesmo link de novo: já usado, leva ao login.
  const again = await browser.newPage();
  await again.goto(link);
  await expect(again.getByRole("heading", { name: "Convite já usado" })).toBeVisible();
  await again.close();
  await ctx.close();
});

test("link adulterado não mostra convite", async ({ page }) => {
  await page.goto(`/convite/${"x".repeat(32)}`);
  await expect(page.getByText("Este convite não vale")).toBeVisible();
  await expect(page.getByLabel("Crie uma senha")).toHaveCount(0);
});
