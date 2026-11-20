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
