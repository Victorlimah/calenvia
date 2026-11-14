import { describe, expect, it } from "vitest";
import { countVariables, fillTemplate, toMetaCreatePayload, WHATSAPP_TEMPLATES } from "./templates";

describe("templates da Meta", () => {
  it.each(Object.entries(WHATSAPP_TEMPLATES))("%s segue as regras de cadastro", (_, t) => {
    expect(t.category).toBe("UTILITY");
    expect(t.language).toBe("pt_BR");
    expect(t.name).toMatch(/^[a-z0-9_]+$/);
    expect(t.body.trim().startsWith("{{")).toBe(false);
    expect(t.body.trim().endsWith("}}")).toBe(false);
    expect(t.example).toHaveLength(countVariables(t.body));
    expect(t.body.length).toBeLessThanOrEqual(1024);
    // variáveis em sequência, sem pular números
    const nums = [...t.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    expect([...new Set(nums)].sort((a, b) => a - b)).toEqual(
      nums.map((_, i) => i + 1).slice(0, new Set(nums).size),
    );
  });

  it("preenche variáveis", () => {
    expect(fillTemplate("Oi {{1}}, {{2}}!", ["Ana", "tudo bem"])).toBe("Oi Ana, tudo bem!");
  });

  it("payload de cadastro", () => {
    const p = toMetaCreatePayload(WHATSAPP_TEMPLATES.confirmation);
    expect(p.components[0].example.body_text[0]).toHaveLength(8);
  });
});
