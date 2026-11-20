import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import { admin, ZE_BIZ } from "./helpers";

// Garante que o profissional de teste não fica no seed (quebraria os testes de banco).
const removeBruno = () =>
  admin.from("staff_members").delete().eq("business_id", ZE_BIZ).eq("name", "Bruno Teste");
test.beforeAll(removeBruno);
test.afterAll(removeBruno);

async function loginAsZe(page: Page, next = "/") {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill("ze@calenvia.dev");
  await page.getByLabel("Senha").fill("calenvia123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, "\\$&") + "$"));
}

test("edita um serviço nos ajustes", async ({ page }) => {
  await loginAsZe(page, "/negocio/servicos");
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Preço (R$)").fill("45,00");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 45,00").first()).toBeVisible();
  // volta ao preço do seed
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Preço (R$)").fill("40,00");
  await page.getByRole("button", { name: "Salvar serviço" }).click();
  await expect(page.getByText("R$ 40,00").first()).toBeVisible();
});

test("cadastra profissional com serviços", async ({ page }) => {
  await loginAsZe(page, "/negocio/equipe");
  await page.getByRole("button", { name: "+ Adicionar profissional" }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Bruno Teste");
  await page.getByLabel("Barba completa").uncheck();
  await page.getByRole("button", { name: "Salvar profissional" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Bruno Teste" }).first()).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: "Bruno Teste" })
    .getByRole("button", { name: "Editar" })
    .first()
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Bruno Teste" })).toHaveCount(0);
});

test("horário inválido mostra erro", async ({ page }) => {
  await loginAsZe(page, "/negocio/horarios");
  await page.getByLabel("Fecha (Terça)").fill("08:00");
  await page.getByRole("button", { name: "Salvar horários" }).click();
  await expect(page.getByText(/Terça: O fechamento precisa ser depois/)).toBeVisible();
});

test("navegação inferior leva aos ajustes", async ({ page }) => {
  await loginAsZe(page, "/");
  await page
    .getByRole("navigation", { name: "Menu principal" })
    .last()
    .getByRole("link", { name: "Ajustes" })
    .click();
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
});

test("salva as regras da agenda", async ({ page }) => {
  await loginAsZe(page, "/negocio/horarios");
  await page.getByLabel("Intervalo entre horários").selectOption("15");
  await page.getByRole("button", { name: "Salvar regras" }).click();
  await expect(page.getByText("Regras salvas.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Intervalo entre horários")).toHaveValue("15");
  await page.getByLabel("Intervalo entre horários").selectOption("30");
  await page.getByRole("button", { name: "Salvar regras" }).click();
  await expect(page.getByText("Regras salvas.")).toBeVisible();
});

test("envia e remove a foto de um profissional", async ({ page }) => {
  await loginAsZe(page, "/negocio/equipe");
  await page.getByRole("button", { name: "Editar" }).first().click();
  await page.getByLabel("Enviar foto").setInputFiles("tests/e2e/fixtures/foto.png");
  await expect(page.getByRole("button", { name: "Remover foto" })).toBeVisible({ timeout: 15000 });
  const src = await page.locator("img").first().getAttribute("src");
  expect(src).toMatch(/business-media\/.+\/staff\/.+\.webp$/);
  await page.getByRole("button", { name: "Remover foto" }).click();
  await expect(page.getByRole("button", { name: "Remover foto" })).toHaveCount(0);
});

test("aparência: prévia ao vivo, cor e capa", async ({ page }) => {
  await loginAsZe(page, "/negocio/aparencia");
  const preview = page.getByRole("complementary", { name: "Prévia da página" });
  await page.getByLabel("Título da página").fill("Corte de respeito");
  await expect(preview.getByRole("heading", { name: "Corte de respeito" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar aparência" }).click();
  await expect(page.getByText("Aparência salva.")).toBeVisible();
  await page.getByLabel("Enviar foto de capa").setInputFiles("tests/e2e/fixtures/foto.png");
  await expect(page.getByRole("button", { name: "Remover capa" })).toBeVisible({ timeout: 15000 });
  // restaura
  await page.getByRole("button", { name: "Remover capa" }).click();
  await page.getByLabel("Título da página").fill("Seu corte no horário certo, sem fila.");
  await page.getByRole("button", { name: "Salvar aparência" }).click();
  await expect(page.getByText("Aparência salva.")).toBeVisible();
});

test("cores: paleta pronta clara, cor inválida, salvar e a página pública muda (CAL-141)", async ({
  page,
}) => {
  try {
    await loginAsZe(page, "/negocio/aparencia");
    const preview = page.getByRole("complementary", { name: "Prévia da página" });
    await page.getByRole("button", { name: "Claro", exact: true }).click();
    await page.getByRole("button", { name: "Lavanda suave" }).click();
    await expect(page.getByRole("button", { name: "Lavanda suave" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Prévia já no fundo claro da paleta.
    await expect(preview.locator("section").first()).toHaveCSS(
      "background-color",
      "rgb(248, 245, 253)",
    );
    await page.getByLabel("Cor principal", { exact: true }).fill("roxo");
    await expect(page.getByText("Cor inválida. Use o formato #RRGGBB")).toBeVisible();
    await page.getByLabel("Cor principal", { exact: true }).fill("#FFE600");
    await expect(page.getByText("Ajustamos para ficar legível")).toBeVisible();
    await page.getByRole("button", { name: "Voltar à paleta original" }).click();
    await expect(page.getByLabel("Cor principal", { exact: true })).toHaveValue("#7048B6");
    await page.getByRole("button", { name: "Elegante" }).click();
    await page.getByRole("button", { name: "Bem arredondados" }).click();
    await page.getByRole("button", { name: "Salvar visual" }).click();
    await expect(page.getByText("Visual salvo.")).toBeVisible();

    await page.goto("http://barbearia-do-ze.localhost:3000/");
    await expect(page.locator("main section, section").first()).toHaveCSS(
      "background-color",
      "rgb(248, 245, 253)",
    );
    await expect(page.getByRole("link", { name: "Agendar meu horário" }).first()).toHaveCSS(
      "background-color",
      "rgb(112, 72, 182)",
    );
    // Fonte e cantos do tema na página pública.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("font-family", /Playfair/);
    await expect(page.getByRole("link", { name: "Agendar meu horário" }).first()).toHaveCSS(
      "border-top-left-radius",
      "999px",
    );
  } finally {
    await admin
      .from("businesses")
      .update({ theme: null, accent_color: "#F5B014" })
      .eq("id", ZE_BIZ);
  }
});

test("link da página para copiar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsZe(page, "/negocio");
  await expect(page.getByText("barbearia-do-ze.localhost:3000")).toBeVisible();
  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByRole("button", { name: "Link copiado!" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver minha página" })).toHaveAttribute(
    "href",
    "http://barbearia-do-ze.localhost:3000/",
  );
});

test("logo opcional: envia com recorte, reduz para 512 px e some para o monograma (CAL-143)", async ({
  page,
}) => {
  try {
    await loginAsZe(page, "/negocio/aparencia");
    const preview = page.getByRole("complementary", { name: "Prévia da página" });
    // Sem logo: monograma com as iniciais.
    await expect(preview.getByText("BZ", { exact: true })).toBeVisible();
    await page.getByLabel("Enviar logo").setInputFiles("tests/e2e/fixtures/logo-grande.png");
    await expect(page.getByText("Arraste para posicionar e ajuste o zoom")).toBeVisible();
    await page.getByLabel("Zoom").fill("1.5");
    await page.getByRole("button", { name: "Salvar logo" }).click();
    const img = preview.getByRole("img", { name: "Logo da Barbearia do Zé" });
    await expect(img).toBeVisible({ timeout: 15000 });
    const { data } = await admin.from("businesses").select("logo_url").eq("id", ZE_BIZ).single();
    expect(data?.logo_url).toMatch(/\/logo\/.+\.png$/);
    const width = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth);
    expect(width).toBeLessThanOrEqual(512);

    await page.goto("http://barbearia-do-ze.localhost:3000/");
    await expect(page.getByRole("img", { name: "Logo da Barbearia do Zé" }).first()).toBeVisible();

    await page.goto("/negocio/aparencia");
    await page.getByRole("button", { name: "Remover logo" }).click();
    await expect(preview.getByText("BZ", { exact: true })).toBeVisible();
  } finally {
    await admin.from("businesses").update({ logo_url: null, logo_alt_url: null }).eq("id", ZE_BIZ);
  }
});
