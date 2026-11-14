import { describe, expect, it } from "vitest";
import { periodLabel, waitlistBookingLink, waitlistMessage } from "./waitlist";

const entry = {
  customer_name: "Juliana Souza",
  service_id: "s1",
  staff_member_id: null,
  desired_date: "2026-11-21",
};

describe("lista de espera", () => {
  it("link leva direto aos horários do dia", () => {
    const link = waitlistBookingLink("ana-nails", entry);
    expect(link).toContain("ana-nails.");
    expect(link).toContain(
      "/agendar?passo=horario&servico=s1&profissional=qualquer&data=2026-11-21",
    );
  });

  it("mensagem com primeiro nome, serviço e dia", () => {
    const msg = waitlistMessage(
      { name: "Ana Nails", slug: "ana-nails", timezone: "America/Sao_Paulo" },
      entry,
      "Manicure",
    );
    expect(msg).toMatch(
      /^Olá, Juliana! Aqui é da \*Ana Nails\*\. Abriu um horário de \*Manicure\*/,
    );
    expect(msg).toContain("21/11");
  });

  it("rótulo do período", () => {
    expect(periodLabel("evening")).toBe("Noite");
    expect(periodLabel("x")).toBe("Qualquer horário");
  });
});
