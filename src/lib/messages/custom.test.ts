import { describe, expect, it } from "vitest";
import { confirmationText } from "./templates";
import { DEFAULT_TEMPLATES, fillCustom, messageFor, validateCustomText } from "./custom";

const v = {
  customerName: "Lucas Andrade",
  businessName: "Barbearia do Zé",
  serviceName: "Corte",
  staffName: "Zé",
  start: new Date("2026-11-21T17:30:00Z"),
  timezone: "America/Fortaleza",
  link: "https://x/gerenciar/ABC234",
};

describe("textos personalizados", () => {
  it("o padrão com variáveis gera exatamente o texto do template", () => {
    expect(fillCustom(DEFAULT_TEMPLATES.confirmation, v)).toBe(confirmationText(v));
  });

  it("preenche as variáveis e mantém as desconhecidas", () => {
    expect(fillCustom("E aí {nome}, {hora} na {negocio}! {x}", v)).toBe(
      "E aí Lucas, 14:30 na Barbearia do Zé! {x}",
    );
  });

  it("valida tamanho e variáveis", () => {
    expect(validateCustomText("oi")).toMatch(/pelo menos/);
    expect(validateCustomText("Olá {cliente}, tudo bem?")).toBe(
      "Variável desconhecida: {cliente}.",
    );
    expect(validateCustomText("x".repeat(701))).toMatch(/700/);
    expect(validateCustomText("Olá {nome}, te esperamos às {hora}!")).toBeNull();
  });

  it("usa o texto do negócio quando existe e válido; senão o padrão", () => {
    expect(
      messageFor("confirmation", { confirmation: "Fala {nome}! Confirmado às {hora}." }, v),
    ).toBe("Fala Lucas! Confirmado às 14:30.");
    expect(messageFor("confirmation", {}, v)).toBe(confirmationText(v));
    expect(messageFor("confirmation", { confirmation: "{bad}" }, v)).toBe(confirmationText(v));
  });
});
