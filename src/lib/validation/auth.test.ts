import { describe, expect, it } from "vitest";
import { authErrorMessage, newPasswordSchema, signInSchema, signUpSchema } from "./auth";

describe("validação de autenticação", () => {
  it("normaliza o e-mail", () => {
    const r = signInSchema.parse({ email: "  ZE@Calenvia.dev ", password: "x" });
    expect(r.email).toBe("ze@calenvia.dev");
  });
  it("exige senha com 8 caracteres no cadastro", () => {
    const r = signUpSchema.safeParse({ name: "Zé", email: "a@a.com", password: "123" });
    expect(r.success).toBe(false);
  });
  it("confere a confirmação de senha", () => {
    expect(newPasswordSchema.safeParse({ password: "12345678", confirm: "12345679" }).success).toBe(
      false,
    );
    expect(newPasswordSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(
      true,
    );
  });
  it("traduz erros do Supabase", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage("User already registered")).toMatch(/Já existe/);
    expect(authErrorMessage("qualquer coisa")).toMatch(/Tente de novo/);
  });
});
