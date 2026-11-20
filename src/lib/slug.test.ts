import { describe, expect, it } from "vitest";
import { slugSuggestions, slugify, validateSlug } from "./slug";

describe("slugify", () => {
  it.each([
    ["Barbearia do Zé", "barbearia-do-ze"],
    ["  Studio  Pilates & Cia ", "studio-pilates-e-cia"],
    ["Clínica São João!!!", "clinica-sao-joao"],
    ["Ana_Nails 24h", "ana-nails-24h"],
    ["---", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("corta em 40 caracteres sem hífen no fim", () => {
    const s = slugify("a".repeat(39) + " bbbb");
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("validateSlug", () => {
  it("aceita slug bom", () => {
    expect(validateSlug("barbearia-do-ze")).toBeNull();
    expect(validateSlug("studio24")).toBeNull();
  });
  it.each([
    ["ab", "pelo menos"],
    ["Barbearia", "minúsculas"],
    ["barbearia_ze", "sem acento"],
    ["-barbearia", "hífen"],
    ["barba--ze", "dois hífens"],
    ["admin", "reservado"],
    ["app", "reservado"],
    ["www", "reservado"],
  ])("%s é inválido (%s)", (slug, msg) => {
    expect(validateSlug(slug)).toMatch(new RegExp(msg));
  });
});

describe("slugSuggestions", () => {
  it("sugere alternativas válidas e diferentes", () => {
    const s = slugSuggestions("Barbearia do Zé", "Fortaleza");
    expect(s[0]).toBe("barbearia-do-ze-fortaleza");
    expect(s.length).toBe(4);
    expect(new Set(s).size).toBe(4);
    for (const v of s) expect(validateSlug(v)).toBeNull();
  });

  it("endereços demo-* ficam reservados para as demonstrações (CAL-152)", async () => {
    const { validateSlug } = await import("./slug");
    expect(validateSlug("demo-clinica")).toMatch(/reservado/);
    expect(validateSlug("demolidora")).toBeNull();
  });
});
