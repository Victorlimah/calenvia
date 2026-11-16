/**
 * Exportação do mês em CSV (CAL-127). Separador ";" e BOM para abrir certo no Excel em
 * português. Função pura, testada em csv.test.ts.
 */
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/metrics-owner/stats";

export type CsvAppointment = {
  date: string; // AAAA-MM-DD
  time: string; // HH:mm
  customer: string;
  service: string;
  staff: string;
  priceCents: number;
  paymentMethod: PaymentMethod | null;
};

export type CsvEntry = {
  date: string;
  kind: "income" | "expense";
  category: string;
  description: string | null;
  amountCents: number;
};

export function csvCell(value: string | number): string {
  let s = String(value);
  // Evita que planilhas executem fórmulas vindas de texto do usuário.
  if (typeof value === "string" && /^([=+@\t\r]|-(?![\d,]+$))/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const brDate = (d: string) => d.split("-").reverse().join("/");

export function monthCsv(appointments: CsvAppointment[], entries: CsvEntry[]): string {
  const lines: (string | number)[][] = [
    [
      "Tipo",
      "Data",
      "Hora",
      "Descrição",
      "Serviço/Categoria",
      "Profissional",
      "Forma de pagamento",
      "Valor (R$)",
    ],
  ];
  for (const a of appointments) {
    lines.push([
      "Atendimento",
      brDate(a.date),
      a.time,
      a.customer,
      a.service,
      a.staff,
      a.paymentMethod ? PAYMENT_LABELS[a.paymentMethod] : "",
      money(a.priceCents),
    ]);
  }
  for (const e of entries) {
    lines.push([
      e.kind === "income" ? "Receita" : "Despesa",
      brDate(e.date),
      "",
      e.description ?? "",
      e.category,
      "",
      "",
      (e.kind === "expense" ? "-" : "") + money(e.amountCents),
    ]);
  }
  return "﻿" + lines.map((l) => l.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
