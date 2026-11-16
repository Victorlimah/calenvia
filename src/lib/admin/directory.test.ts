import { describe, expect, it } from "vitest";
import { directoryHref, lastAccessLabel, parseDirectoryFilters } from "./directory";

describe("lista de negócios do admin (CAL-130)", () => {
  it("aceita só filtros conhecidos", () => {
    const f = parseDirectoryFilters({
      q: "  zé ",
      plano: "pro",
      status: "inventado",
      segmento: "barbearia",
      ordem: "valor",
      pagina: "3",
    });
    expect(f).toEqual({
      q: "zé",
      plan: "pro",
      status: null,
      segment: "barbearia",
      city: "",
      sort: "valor",
      page: 3,
    });
    expect(parseDirectoryFilters({ pagina: "-2", ordem: "x" })).toMatchObject({
      page: 1,
      sort: "recentes",
    });
  });

  it("monta o link mantendo os filtros e omitindo o padrão", () => {
    const f = parseDirectoryFilters({ q: "ana", status: "past_due" });
    expect(directoryHref(f)).toBe("/admin?q=ana&status=past_due");
    expect(directoryHref(f, { page: 2 })).toBe("/admin?q=ana&status=past_due&pagina=2");
    expect(directoryHref(parseDirectoryFilters({}))).toBe("/admin");
  });

  it("último acesso em linguagem simples", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    expect(lastAccessLabel(null, now)).toBe("Nunca entrou");
    expect(lastAccessLabel("2026-11-16T08:00:00Z", now)).toBe("Hoje");
    expect(lastAccessLabel("2026-11-15T08:00:00Z", now)).toBe("Ontem");
    expect(lastAccessLabel("2026-11-06T12:00:00Z", now)).toBe("Há 10 dias");
    expect(lastAccessLabel("2026-08-01T12:00:00Z", now)).toBe("Há 3 meses");
  });
});
