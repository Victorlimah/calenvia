import { expect, test } from "@playwright/test";

test("painel instalável: manifest, ícones, service worker e página offline", async ({
  request,
}) => {
  const res = await request.get("http://app.localhost:3000/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m).toMatchObject({
    name: "Calenvia — sua agenda",
    start_url: "/",
    display: "standalone",
    theme_color: "#4B3FD9",
  });
  expect(m.shortcuts.map((s: { url: string }) => s.url)).toContain("/novo");

  for (const icon of m.icons) {
    const r = await request.get(`http://app.localhost:3000${icon.src}`);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
  const sw = await request.get("http://app.localhost:3000/sw.js");
  expect(sw.status()).toBe(200);
  expect(await sw.text()).toContain("offline.html");
  const off = await request.get("http://app.localhost:3000/offline.html");
  expect(await off.text()).toContain("Sem conexão");
});

test("página do painel aponta para o manifest e ícone da Apple", async ({ page }) => {
  await page.goto("http://app.localhost:3000/entrar");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon.png",
  );
});
