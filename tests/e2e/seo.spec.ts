import { expect, test } from "@playwright/test";

const ZE = "http://barbearia-do-ze.localhost:3000";

test("página do negócio: metadados, prévia do link e dados estruturados", async ({
  page,
  request,
}) => {
  await page.goto(ZE);
  await expect(page).toHaveTitle("Barbearia do Zé — Agende seu horário");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toBe(`${ZE}/og`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", ZE);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "LocalBusiness", name: "Barbearia do Zé" });

  const img = await request.get(`${ZE}/og`);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
  expect((await img.body()).length).toBeGreaterThan(5000);
});

test("robots e sitemap por host", async ({ request }) => {
  const app = await (await request.get("http://app.localhost:3000/robots.txt")).text();
  expect(app).toContain("Disallow: /");
  const biz = await (await request.get(`${ZE}/robots.txt`)).text();
  expect(biz).toContain("Allow: /");
  expect(biz).toContain(`Sitemap: ${ZE}/sitemap.xml`);
  const map = await (await request.get(`${ZE}/sitemap.xml`)).text();
  expect(map).toContain(`${ZE}/agendar`);
  const site = await (await request.get("http://localhost:3000/sitemap.xml")).text();
  expect(site).toContain("http://localhost:3000/termos");
});

test("site tem imagem de prévia", async ({ page, request }) => {
  await page.goto("http://localhost:3000");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toMatch(/opengraph-image/);
  const img = await request.get(og!);
  expect(img.status()).toBe(200);
});
