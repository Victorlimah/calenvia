import { expect, test } from "./fixtures";
import { axeViolations, describeViolations } from "./a11y";
import { admin, ZE_BIZ } from "./helpers";
import { TEMPLATES } from "../../src/lib/themes/registry";
import { themeFromTemplate } from "../../src/lib/themes/apply";
import { findFontPair } from "../../src/lib/themes/font-pairs";

/**
 * Varredura dos templates (CAL-145/152): cada template do registro, em 390 px e 1280 px, sem
 * rolagem horizontal, sem violação WCAG AA e sem erro no console. Guarda a primeira tela em
 * docs/temas/ como referência visual. Template novo no registro entra aqui sozinho.
 * Só este arquivo: `npm run test:e2e -- temas`.
 */
const ZE = "http://barbearia-do-ze.localhost:3000/";

test.afterAll(async () => {
  await admin.from("businesses").update({ theme: null }).eq("id", ZE_BIZ);
});

for (const tpl of TEMPLATES) {
  for (const width of [390, 1280]) {
    test(`tema ${tpl.meta.name} em ${width} px`, async ({ page }) => {
      test.setTimeout(90_000);
      await admin
        .from("businesses")
        .update({ theme: themeFromTemplate(tpl.meta, { accent: "#F5B014" }) })
        .eq("id", ZE_BIZ);
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      await page.goto(ZE, { waitUntil: "networkidle" });
      await expect(page.locator("[data-template]")).toHaveAttribute("data-template", tpl.meta.id);
      await expect(page.getByRole("link", { name: "Agendar meu horário" }).first()).toBeVisible();

      // Fontes do par carregadas na raiz (variáveis do next/font definidas).
      const pair = findFontPair(tpl.meta.fontPairId);
      const vars = await page.evaluate(
        ([d, b]) => {
          const root = document.querySelector("[data-theme-root]")!;
          const cs = getComputedStyle(root);
          return [cs.getPropertyValue(d), cs.getPropertyValue(b), cs.fontFamily];
        },
        [pair.displayVar, pair.bodyVar],
      );
      expect(vars[0], "fonte dos títulos").not.toBe("");
      expect(vars[1], "fonte do texto").not.toBe("");
      expect(vars[2], "texto usa a fonte do par").toContain(
        vars[1].split(",")[0].replace(/['"]/g, "").trim(),
      );

      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll, "rolagem horizontal").toBeLessThanOrEqual(width);

      await page.screenshot({
        path: `docs/temas/${tpl.meta.id}-${width}.jpg`,
        type: "jpeg",
        quality: 70,
        scale: "css",
      });

      const v = await axeViolations(page);
      expect(v, describeViolations(v)).toEqual([]);
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
}

// O outro modo (claro ↔ escuro) de cada template, que o dono pode escolher no editor.
for (const tpl of TEMPLATES) {
  const other = tpl.meta.mode === "light" ? "dark" : "light";
  test(`tema ${tpl.meta.name} no modo ${other === "dark" ? "escuro" : "claro"} (390 px)`, async ({
    page,
  }) => {
    const paletteId = tpl.meta.paletteId ?? tpl.meta.altPaletteIds[0];
    await admin
      .from("businesses")
      .update({ theme: themeFromTemplate(tpl.meta, { paletteId, mode: other }) })
      .eq("id", ZE_BIZ);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ZE, { waitUntil: "networkidle" });
    await expect(page.locator("[data-template]")).toHaveAttribute("data-template", tpl.meta.id);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(390);
    const v = await axeViolations(page);
    expect(v, describeViolations(v)).toEqual([]);
  });
}

// CAL-147: foto de capa vertical, horizontal ou minúscula não quebra a abertura; duotone ativo.
const tall = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="1200"><rect width="300" height="1200" fill="#c47"/></svg>')}`;
const tiny = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="9"><rect width="12" height="9" fill="#4a7"/></svg>')}`;
for (const tpl of TEMPLATES) {
  test(`tema ${tpl.meta.name}: capa vertical e minúscula, fotos em duotone`, async ({ page }) => {
    try {
      for (const cover of [tall, tiny]) {
        await admin
          .from("businesses")
          .update({
            cover_url: cover,
            theme: { ...themeFromTemplate(tpl.meta, { accent: "#F5B014" }), photoStyle: "duotone" },
          })
          .eq("id", ZE_BIZ);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(ZE, { waitUntil: "networkidle" });
        await expect(page.locator("[data-photo]")).toHaveAttribute("data-photo", "duotone");
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scroll).toBeLessThanOrEqual(390);
        // A abertura continua com o botão na primeira tela e mais curta que 3 telas.
        const heroHeight = await page
          .locator("section")
          .first()
          .evaluate((el) => el.getBoundingClientRect().height);
        expect(heroHeight).toBeLessThan(844 * 3);
      }
    } finally {
      await admin.from("businesses").update({ cover_url: null }).eq("id", ZE_BIZ);
    }
  });
}
