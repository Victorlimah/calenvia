import { describe, expect, it } from "vitest";
import { dnsInstructions, normalizeDomain, validateDomain } from "./normalize";

describe("domínio próprio", () => {
  it("normaliza o que o dono cola", () => {
    expect(normalizeDomain(" https://Agenda.MeuSalao.com.br/agendar?x=1 ")).toBe(
      "agenda.meusalao.com.br",
    );
    expect(normalizeDomain("meusalao.com.br.")).toBe("meusalao.com.br");
  });

  it("aceita domínios válidos", () => {
    expect(validateDomain("agenda.meusalao.com.br", "calenvia.com.br")).toBeNull();
    expect(validateDomain("meusalao.com", "calenvia.com.br")).toBeNull();
  });

  it("recusa inválidos e endereços da própria Calenvia", () => {
    expect(validateDomain("meusalao", "calenvia.com.br")).toMatch(/completo/);
    expect(validateDomain("-x.com", "calenvia.com.br")).toMatch(/inválido/);
    expect(validateDomain("10.0.0.1", "calenvia.com.br")).toMatch(/IP/);
    expect(validateDomain("ze.calenvia.com.br", "calenvia.com.br")).toMatch(/Calenvia/);
    expect(validateDomain("calenvia.com.br", "calenvia.com.br")).toMatch(/Calenvia/);
    expect(validateDomain("x.vercel.app", "calenvia.com.br")).toMatch(/não permitido/);
  });

  it("DNS: raiz usa A, subdomínio usa CNAME", () => {
    expect(dnsInstructions("meusalao.com.br")).toEqual({
      type: "A",
      name: "@",
      value: "76.76.21.21",
    });
    expect(dnsInstructions("meusalao.com")).toMatchObject({ type: "A" });
    expect(dnsInstructions("agenda.meusalao.com.br")).toEqual({
      type: "CNAME",
      name: "agenda",
      value: "cname.vercel-dns.com",
    });
  });
});
