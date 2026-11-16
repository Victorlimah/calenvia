import { describe, expect, it } from "vitest";
import { activeNavKey, navItemsFor } from "./painel-nav";

const labels = (role: string, device: "desktop" | "mobile") =>
  navItemsFor({ role }, device).map((i) => i.label);

describe("menu do painel (CAL-117)", () => {
  it("dono vê os 6 itens no computador e 5 no celular", () => {
    expect(labels("owner", "desktop")).toEqual([
      "Início",
      "Agenda",
      "Clientes",
      "Financeiro",
      "Meu negócio",
      "Ajustes",
    ]);
    expect(labels("owner", "mobile")).toEqual([
      "Início",
      "Agenda",
      "Clientes",
      "Meu negócio",
      "Ajustes",
    ]);
  });

  it("gerente vê o mesmo que o dono", () => {
    expect(labels("manager", "desktop")).toEqual(labels("owner", "desktop"));
  });

  it("recepção e profissional não veem Financeiro nem Meu negócio", () => {
    for (const role of ["reception", "staff"]) {
      expect(labels(role, "desktop")).toEqual(["Início", "Agenda", "Clientes", "Ajustes"]);
      expect(labels(role, "mobile")).toEqual(["Início", "Agenda", "Clientes", "Ajustes"]);
    }
  });

  it("sem papel válido, só o básico", () => {
    expect(labels("qualquer", "desktop")).toEqual(["Início", "Agenda", "Clientes", "Ajustes"]);
  });

  it("item ativo por rota", () => {
    expect(activeNavKey("/", "desktop")).toBe("inicio");
    expect(activeNavKey("/painel", "desktop")).toBe("inicio");
    expect(activeNavKey("/agenda", "desktop")).toBe("agenda");
    expect(activeNavKey("/agendamento/123", "mobile")).toBe("agenda");
    expect(activeNavKey("/novo", "mobile")).toBe("agenda");
    expect(activeNavKey("/registrar", "mobile")).toBe("agenda");
    expect(activeNavKey("/bloquear", "mobile")).toBe("agenda");
    expect(activeNavKey("/clientes/abc", "desktop")).toBe("clientes");
    expect(activeNavKey("/negocio/servicos", "desktop")).toBe("negocio");
    expect(activeNavKey("/avaliacoes", "desktop")).toBe("negocio");
    expect(activeNavKey("/ajustes/conta", "desktop")).toBe("ajustes");
    expect(activeNavKey("/assinatura", "desktop")).toBe("ajustes");
    expect(activeNavKey("/meus-horarios", "mobile")).toBe("ajustes");
  });

  it("Financeiro acende o Início no celular e o próprio item no computador", () => {
    expect(activeNavKey("/financeiro", "desktop")).toBe("financeiro");
    expect(activeNavKey("/financeiro/relatorios", "desktop")).toBe("financeiro");
    expect(activeNavKey("/financeiro", "mobile")).toBe("inicio");
  });

  it("não confunde prefixos parecidos", () => {
    expect(activeNavKey("/agendamentos-x", "desktop")).toBeNull();
    expect(activeNavKey("/negociox", "desktop")).toBeNull();
  });
});

describe("abas de Meu negócio (CAL-118)", () => {
  it("dono vê as 5 abas; aba ativa pelo prefixo mais longo", async () => {
    const { NEGOCIO_TABS, activeTab, tabsFor } = await import("./painel-nav");
    expect(tabsFor(NEGOCIO_TABS, { role: "owner" }).map((t) => t.label)).toEqual([
      "Dados e página",
      "Serviços e valores",
      "Equipe",
      "Horários",
      "Pacotes",
    ]);
    expect(tabsFor(NEGOCIO_TABS, { role: "staff" })).toEqual([]);
    expect(activeTab(NEGOCIO_TABS, "/negocio")?.label).toBe("Dados e página");
    expect(activeTab(NEGOCIO_TABS, "/negocio/aparencia")?.label).toBe("Dados e página");
    expect(activeTab(NEGOCIO_TABS, "/painel/negocio/equipe/abc/horario")?.label).toBe("Equipe");
    expect(activeTab(NEGOCIO_TABS, "/negocio/servicos")?.label).toBe("Serviços e valores");
    expect(activeTab(NEGOCIO_TABS, "/clientes")).toBeNull();
  });
});
