import { describe, expect, it } from "vitest";
import { localDateTimeToUtc } from "@/lib/dates";
import { cancellationText, confirmationText, reminderText, templateParams } from "./templates";

const vars = {
  customerName: "Lucas Andrade",
  businessName: "Barbearia do Zé",
  serviceName: "Corte masculino",
  staffName: "Zé Carlos",
  start: localDateTimeToUtc("2026-11-21", "14:30", "America/Fortaleza"),
  timezone: "America/Fortaleza",
  link: "https://barbearia-do-ze.calenvia.com.br/gerenciar/ABC234",
};

describe("textos das mensagens", () => {
  it("confirmação segue o texto de referência", () => {
    expect(confirmationText(vars)).toBe(
      "Olá, Lucas! Aqui é da *Barbearia do Zé*. Seu horário de *Corte masculino* com Zé Carlos está confirmado para *sábado, 21/11 às 14:30*. Para remarcar ou cancelar: https://barbearia-do-ze.calenvia.com.br/gerenciar/ABC234",
    );
  });
  it("lembrete e cancelamento", () => {
    expect(reminderText(vars)).toMatch(/^Olá, Lucas! Lembrete da \*Barbearia do Zé\*/);
    expect(cancellationText(vars)).toMatch(/foi cancelado/);
  });
  it("parâmetros do template", () => {
    expect(templateParams("confirmation", vars)).toEqual([
      "Lucas",
      "Barbearia do Zé",
      "Corte masculino",
      "Zé Carlos",
      "sábado",
      "21/11",
      "14:30",
      vars.link,
    ]);
  });
});
