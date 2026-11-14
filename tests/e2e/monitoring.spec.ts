import { expect, test } from "@playwright/test";

test("rota de erros do navegador aceita relatório válido e recusa lixo", async ({ request }) => {
  const ok = await request.post("http://localhost:3000/api/errors", {
    data: { message: "Teste de monitoramento", name: "TestError", path: "/teste" },
  });
  expect(ok.status()).toBe(204);
  const bad = await request.post("http://localhost:3000/api/errors", {
    headers: { "content-type": "application/json" },
    data: "isso não é json",
  });
  expect(bad.status()).toBe(400);
  const big = await request.post("http://localhost:3000/api/errors", {
    data: { message: "x".repeat(9000) },
  });
  expect(big.status()).toBe(413);
});
