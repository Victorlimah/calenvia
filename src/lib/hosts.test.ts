import { describe, expect, it } from "vitest";
import {
  appUrl,
  businessUrl,
  isReservedSlug,
  isSlugShape,
  resolveHost,
  rewritePath,
} from "./hosts";

describe("resolveHost em produção", () => {
  const root = "calenvia.com.br";
  it("site", () => {
    expect(resolveHost("calenvia.com.br", root)).toEqual({ kind: "site" });
    expect(resolveHost("www.calenvia.com.br", root)).toEqual({ kind: "site" });
    expect(resolveHost("CALENVIA.com.br", root)).toEqual({ kind: "site" });
  });
  it("painel", () => {
    expect(resolveHost("app.calenvia.com.br", root)).toEqual({ kind: "app" });
  });
  it("negócio", () => {
    expect(resolveHost("barbearia-do-ze.calenvia.com.br", root)).toEqual({
      kind: "business",
      slug: "barbearia-do-ze",
    });
  });
  it("slug reservado ou inválido não é negócio", () => {
    expect(resolveHost("api.calenvia.com.br", root)).toEqual({ kind: "unknown" });
    expect(resolveHost("admin.calenvia.com.br", root)).toEqual({ kind: "unknown" });
    expect(resolveHost("a.b.calenvia.com.br", root)).toEqual({ kind: "unknown" });
    expect(resolveHost("x.calenvia.com.br", root)).toEqual({ kind: "unknown" });
  });
  it("domínio próprio", () => {
    expect(resolveHost("agenda.barbeariadoze.com", root)).toEqual({
      kind: "custom",
      domain: "agenda.barbeariadoze.com",
    });
  });
  it("sem host", () => {
    expect(resolveHost(null, root)).toEqual({ kind: "unknown" });
  });
});

describe("resolveHost em desenvolvimento", () => {
  const root = "localhost:3000";
  it("localhost:3000 é o site", () => {
    expect(resolveHost("localhost:3000", root)).toEqual({ kind: "site" });
    expect(resolveHost("127.0.0.1:3000", root)).toEqual({ kind: "site" });
  });
  it("app.localhost:3000 é o painel", () => {
    expect(resolveHost("app.localhost:3000", root)).toEqual({ kind: "app" });
  });
  it("{slug}.localhost:3000 é o negócio", () => {
    expect(resolveHost("ana-nails.localhost:3000", root)).toEqual({
      kind: "business",
      slug: "ana-nails",
    });
  });
});

describe("slugs", () => {
  it("reservados", () => {
    for (const s of [
      "www",
      "app",
      "api",
      "admin",
      "painel",
      "site",
      "blog",
      "ajuda",
      "suporte",
      "status",
      "mail",
    ]) {
      expect(isReservedSlug(s)).toBe(true);
    }
    expect(isReservedSlug("barbearia")).toBe(false);
  });
  it("formato", () => {
    expect(isSlugShape("barbearia-do-ze")).toBe(true);
    expect(isSlugShape("studio24")).toBe(true);
    expect(isSlugShape("ab")).toBe(false);
    expect(isSlugShape("-abc")).toBe(false);
    expect(isSlugShape("abc-")).toBe(false);
    expect(isSlugShape("Abc")).toBe(false);
    expect(isSlugShape("a--b")).toBe(false);
  });
});

describe("rewrite e URLs", () => {
  it("reescreve conforme o host", () => {
    expect(rewritePath({ kind: "app" }, "/")).toBe("/painel");
    expect(rewritePath({ kind: "app" }, "/agenda")).toBe("/painel/agenda");
    expect(rewritePath({ kind: "business", slug: "ze" }, "/")).toBe("/ze");
    expect(rewritePath({ kind: "business", slug: "ze" }, "/agendar")).toBe("/ze/agendar");
    expect(rewritePath({ kind: "site" }, "/termos")).toBeNull();
  });
  it("monta URLs", () => {
    expect(appUrl("/agenda", "localhost:3000")).toBe("http://app.localhost:3000/agenda");
    expect(businessUrl("ze", "/", "calenvia.com.br")).toBe("https://ze.calenvia.com.br/");
  });
});
