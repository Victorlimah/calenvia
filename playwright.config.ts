import { defineConfig, devices } from "@playwright/test";

// Ponta a ponta contra o app local + Supabase local (npx supabase start && npx supabase db reset).
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  // O modo dev compila cada página na primeira visita: damos folga.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  use: {
    baseURL: "http://app.localhost:3000",
    trace: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
  },
  projects: [
    {
      name: "celular",
      use: {
        ...devices["Pixel 7"],
        // Usa o Chrome instalado na máquina quando existir (sem baixar navegadores).
        channel: process.env.PW_CHANNEL ?? "chrome",
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
