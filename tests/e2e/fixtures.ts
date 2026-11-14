import { test as base } from "@playwright/test";

/**
 * Depois de cada page.goto, espera o React hidratar (html[data-hydrated]),
 * para que cliques não se percam em páginas recém-carregadas no modo dev.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const res = await goto(url, options);
      await page
        .waitForSelector("html[data-hydrated]", { state: "attached", timeout: 30_000 })
        .catch(() => {});
      return res;
    };
    await provide(page);
  },
});

export { expect } from "@playwright/test";
