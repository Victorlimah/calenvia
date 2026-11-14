import { describe, expect, it } from "vitest";
import { buildErrorReport, scrub } from "./monitoring";

describe("monitoramento de erros", () => {
  it("esconde segredos e mascara telefones", () => {
    expect(
      scrub({ access_token: "abc", nested: { password: "x", ok: "falou com 5585999990000" } }),
    ).toEqual({
      access_token: "[oculto]",
      nested: { password: "[oculto]", ok: "falou com 5585*******00" },
    });
  });

  it("monta o relatório com origem, caminho e mensagem", () => {
    const r = buildErrorReport(new TypeError("quebrou para 5511988887777"), {
      source: "server",
      path: "/agendar",
      digest: "123",
    });
    expect(r).toMatchObject({
      level: "error",
      source: "server",
      name: "TypeError",
      message: "quebrou para 5511*******77",
      path: "/agendar",
      digest: "123",
    });
    expect(r.stack).toContain("TypeError");
  });

  it("aceita valores que não são Error", () => {
    expect(buildErrorReport("falhou", { source: "client" }).message).toBe("falhou");
    expect(buildErrorReport({ x: 1 }, { source: "client" }).message).toBe("Erro desconhecido");
  });
});
