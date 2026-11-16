import { describe, expect, it } from "vitest";
import { csvCell, monthCsv } from "./csv";

describe("CSV do mês (CAL-127)", () => {
  it("monta atendimentos e lançamentos com ; e vírgula decimal", () => {
    const csv = monthCsv(
      [
        {
          date: "2026-11-05",
          time: "09:30",
          customer: "Ana; Maria",
          service: "Corte",
          staff: "Zé",
          priceCents: 4000,
          paymentMethod: "pix",
        },
      ],
      [
        {
          date: "2026-11-06",
          kind: "expense",
          category: "Aluguel",
          description: null,
          amountCents: 120000,
        },
      ],
    );
    const lines = csv.replace("﻿", "").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Atendimento;05/11/2026;09:30;"Ana; Maria";Corte;Zé;Pix;40,00');
    expect(lines[2]).toBe("Despesa;06/11/2026;;;Aluguel;;;-1200,00");
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("neutraliza fórmulas e escapa aspas", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell('a;"b"')).toBe('"a;""b"""');
  });
});
