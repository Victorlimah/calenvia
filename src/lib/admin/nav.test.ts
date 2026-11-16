import { describe, expect, it } from "vitest";
import { activeAdminHref, ADMIN_NAV } from "./nav";

describe("menu do admin (CAL-129)", () => {
  it("tem os três grupos na ordem", () => {
    expect(ADMIN_NAV.map((g) => g.title)).toEqual(["Clientes", "Dinheiro", "Saúde"]);
    expect(ADMIN_NAV.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      "Negócios",
      "Suporte",
      "Assinaturas",
      "Preços",
      "Métricas",
      "Mensagens",
    ]);
  });

  it("item ativo por rota", () => {
    expect(activeAdminHref("/admin")).toBe("/admin");
    expect(activeAdminHref("/painel/admin/negocios/abc/visao")).toBe("/admin");
    expect(activeAdminHref("/admin/metricas")).toBe("/admin/metricas");
    expect(activeAdminHref("/admin/precos")).toBe("/admin/precos");
    expect(activeAdminHref("/agenda")).toBeNull();
  });
});
