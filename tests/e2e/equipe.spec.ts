import { expect, test } from "./fixtures";
import { admin, loginAsZe, seededDay, ZE_BIZ } from "./helpers";

// CAL-112: convidar profissional → aceitar → ver só a própria agenda, sem valores.
const RAFAEL = "0d000000-0000-4000-8000-000000000002";

const hydrated = (p: import("@playwright/test").Page) =>
  p.waitForSelector("html[data-hydrated]", { state: "attached", timeout: 30_000 });

async function cleanup() {
  const { data: members } = await admin
    .from("business_members")
    .select("id, user_id")
    .eq("business_id", ZE_BIZ)
    .neq("role", "owner");
  for (const m of members ?? []) {
    await admin.from("business_members").delete().eq("id", m.id);
    await admin.auth.admin.deleteUser(m.user_id);
  }
  await admin.from("business_invitations").delete().eq("business_id", ZE_BIZ);
}

test.beforeAll(cleanup);
test.afterAll(cleanup);

test("profissional convidado vê só a própria agenda e nenhum valor", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await loginAsZe(page, "/negocio/equipe");
  await expect(page.getByRole("heading", { name: "Equipe e acessos" })).toBeVisible();
  await page.getByLabel("Papel", { exact: true }).first().selectOption("staff");
  await page.getByLabel("Cadastro de profissional").selectOption(RAFAEL);
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const linkInput = page.getByLabel("Link do convite");
  await expect(linkInput).toBeVisible();
  const link = await linkInput.inputValue();
  expect(link).toMatch(/\/convite\/[A-Za-z0-9_-]+$/);
  await expect(page.getByRole("link", { name: "Enviar pelo WhatsApp" })).toHaveAttribute(
    "href",
    /wa\.me/,
  );

  // A pessoa convidada abre o link num outro navegador e cria a conta.
  const ctx = await browser.newContext();
  const guest = await ctx.newPage();
  await guest.goto(link);
  await hydrated(guest);
  await expect(guest.getByText("como profissional")).toBeVisible();
  await guest.getByRole("link", { name: "Criar minha conta" }).click();
  await guest.waitForURL(/\/cadastro/);
  await hydrated(guest);
  await guest.getByLabel("Seu nome").fill("Rafael Convidado");
  await guest.getByLabel("E-mail").fill(`rafael+${Date.now()}@calenvia.dev`);
  await guest.getByLabel("Senha").fill("senhaforte123");
  await guest.getByRole("button", { name: "Criar conta" }).click();
  await guest.waitForURL(/\/convite\//);
  await hydrated(guest);
  await guest.getByRole("button", { name: "Aceitar convite" }).click();
  await guest.waitForURL((u) => u.pathname === "/");

  // Agenda do dia com agendamentos do seed: só os do Rafael, sem valores nem "+ Novo".
  const day = await seededDay();
  const { data: appts } = await admin
    .from("appointments")
    .select("id, staff_member_id")
    .eq("business_id", ZE_BIZ)
    .neq("status", "canceled")
    .gte("starts_at", `${day}T00:00:00-03:00`)
    .lt("starts_at", `${day}T23:59:59-03:00`);
  await guest.goto(`/?data=${day}`);
  await expect(guest.getByRole("heading", { name: "Agenda" })).toBeVisible();
  expect(appts?.some((a) => a.staff_member_id !== RAFAEL)).toBe(true);
  for (const a of appts ?? []) {
    const item = guest.locator(`a[href$="/agendamento/${a.id}"]`);
    if (a.staff_member_id === RAFAEL) await expect(item.first()).toBeVisible();
    else await expect(item).toHaveCount(0);
  }
  await expect(guest.getByText("Previsto")).toHaveCount(0);
  await expect(guest.getByRole("link", { name: "+ Novo" })).toHaveCount(0);
  await expect(guest.locator("main")).not.toContainText("R$");

  // Sem Ajustes do negócio, financeiro nem equipe: volta para a agenda.
  for (const path of ["/negocio/servicos", "/financeiro", "/negocio/equipe", "/assinatura"]) {
    await guest.goto(path);
    await expect(guest).toHaveURL((u) => u.pathname === "/");
  }
  await guest.goto("/ajustes");
  await expect(guest.getByRole("link", { name: /Meus horários/ })).toBeVisible();
  await expect(guest.getByRole("link", { name: /Serviços/ })).toHaveCount(0);
  await ctx.close();

  // O dono vê a pessoa na equipe e remove o acesso.
  await page.reload();
  await expect(page.getByText("Rafael Convidado")).toBeVisible();
});

test("convite inválido mostra mensagem clara", async ({ page }) => {
  await page.goto("http://app.localhost:3000/convite/tokenquenaoexiste12345");
  await expect(page.getByText("Convite não encontrado")).toBeVisible();
});
