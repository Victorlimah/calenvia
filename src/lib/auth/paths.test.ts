import { describe, expect, it } from "vitest";
import { isPublicAppPath, safeNextPath } from "./paths";

describe("caminhos de autenticação", () => {
  it("identifica rotas públicas do painel", () => {
    expect(isPublicAppPath("/entrar")).toBe(true);
    expect(isPublicAppPath("/auth/callback")).toBe(true);
    expect(isPublicAppPath("/")).toBe(false);
    expect(isPublicAppPath("/agenda")).toBe(false);
    expect(isPublicAppPath("/entrarx")).toBe(false);
  });
  it("não deixa redirecionar para fora", () => {
    expect(safeNextPath("/agenda")).toBe("/agenda");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(null, "/onboarding")).toBe("/onboarding");
  });
});
