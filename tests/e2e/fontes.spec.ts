import { expect, test } from "./fixtures";
import { admin, ZE_BIZ } from "./helpers";
import { FONT_PAIRS } from "../../src/lib/themes/font-pairs";
import { defaultTheme } from "../../src/lib/themes/resolve";

// CAL-142: cada par de fontes na página pública — sem quebra em 390 px com nome longo e só os
// arquivos de fonte do par escolhido baixados.
const ZE = "http://barbearia-do-ze.localhost:3000/";
const LONG = "Barbearia e Estética Masculina do Zé Carlos Albuquerque";

test.afterAll(async () => {
  await admin.from("businesses").update({ theme: null, name: "Barbearia do Zé" }).eq("id", ZE_BIZ);
});

for (const pair of FONT_PAIRS) {
  test(`fontes ${pair.name}: 390 px sem rolagem e só as fontes do par`, async ({ page }) => {
    await admin
      .from("businesses")
      .update({ theme: { ...defaultTheme("#F5B014"), fontPairId: pair.id }, name: LONG })
      .eq("id", ZE_BIZ);
    const fonts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "font") fonts.push(r.url());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ZE, { waitUntil: "networkidle" });
    await expect(page.getByText(LONG).first()).toBeVisible();
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(390);
    const family = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toContain(pair.displayVar === "--font-bricolage" ? "Bricolage" : "");
    // Nenhuma fonte de outro par: no máximo as do par + as da marca (Bricolage/Inter).
    expect(fonts.length).toBeLessThanOrEqual(6);
  });
}
