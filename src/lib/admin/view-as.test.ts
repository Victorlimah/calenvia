import { describe, expect, it } from "vitest";
import { describeAuditEntry } from "./business-update";
import { shouldLogView, viewAsPageLabel } from "./view-as";

const now = new Date("2026-11-15T12:00:00Z");

describe("shouldLogView (CAL-114)", () => {
  it("sem registro anterior, grava", () => {
    expect(shouldLogView(null, now)).toBe(true);
    expect(shouldLogView(undefined, now)).toBe(true);
  });

  it("menos de 10 minutos depois, não grava", () => {
    expect(shouldLogView("2026-11-15T11:55:00Z", now)).toBe(false);
    expect(shouldLogView(new Date("2026-11-15T11:50:00.001Z"), now)).toBe(false);
  });

  it("10 minutos ou mais depois, grava", () => {
    expect(shouldLogView("2026-11-15T11:50:00Z", now)).toBe(true);
    expect(shouldLogView("2026-11-14T12:00:00Z", now)).toBe(true);
  });

  it("data inválida grava (não deixa de registrar o acesso)", () => {
    expect(shouldLogView("x", now)).toBe(true);
  });
});

describe("histórico do view_as", () => {
  it("texto próprio com a página", () => {
    expect(viewAsPageLabel("agenda")).toBe("agenda");
    expect(viewAsPageLabel("servicos")).toBe("serviços e profissionais");
    expect(describeAuditEntry("view_as", { page: { from: null, to: "agenda" } })).toBe(
      "Viu o painel (agenda)",
    );
    expect(describeAuditEntry("business.update", {})).toBeNull();
  });
});
