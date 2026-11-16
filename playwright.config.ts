import { defineConfig, devices } from "@playwright/test";

// Ponta a ponta contra o app local + Supabase local (npx supabase start && npx supabase db reset).
//
// Porta 3000 ocupada? Rode o app em outra porta e aponte os testes para ela, sem mudar os
// endereços: `E2E_PORT=3001 npm run test:e2e`. O Chrome desvia *.localhost:3000 para a porta
// escolhida (o cabeçalho Host continua "…localhost:3000", então o app resolve os hosts igual).
// Chamadas feitas fora do navegador (request/fetch no Node) continuam indo para a 3000.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const remap =
  PORT === 3000
    ? []
    : [
        `--host-resolver-rules=MAP *.localhost:3000 127.0.0.1:${PORT},MAP localhost:3000 127.0.0.1:${PORT}`,
      ];

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
        launchOptions: { args: remap },
      },
    },
  ],
  webServer: {
    command: PORT === 3000 ? "npm run dev" : `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
