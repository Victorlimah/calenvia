/** Pedido de acesso pela home (CAL-138). Funções puras: validação e CSV. */
import { z } from "zod";
import { SEGMENT_IDS, segmentLabel } from "@/lib/business/segments";
import { whatsappField } from "@/lib/validation/business";

export const accessRequestSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80, "Use no máximo 80 caracteres."),
  businessName: z
    .string()
    .trim()
    .min(2, "Informe o nome do negócio.")
    .max(80, "Use no máximo 80 caracteres."),
  whatsapp: whatsappField,
  segment: z
    .union([z.enum(SEGMENT_IDS), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  city: z
    .string()
    .trim()
    .max(80, "Use no máximo 80 caracteres.")
    .optional()
    .transform((v) => (v ? v : null)),
  /** Campo-isca: gente não vê, robô preenche. */
  website: z.string().optional(),
});

export type AccessRequestInput = z.input<typeof accessRequestSchema>;

export const ACCESS_STATUS_LABELS = {
  new: "Novo",
  contacted: "Contatado",
  invited: "Convidado",
  discarded: "Descartado",
} as const;

export type AccessRequestRow = {
  created_at: string;
  name: string;
  business_name: string;
  whatsapp: string;
  segment: string | null;
  city: string | null;
  status: string;
};

function csvCell(value: string): string {
  // Evita fórmula no Excel/Sheets (=, +, -, @) e escapa aspas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV (separador ;, padrão do Excel em pt-BR) com BOM para abrir com acentos certos. */
export function accessRequestsCsv(rows: AccessRequestRow[]): string {
  const header = ["Data", "Nome", "Negócio", "WhatsApp", "Segmento", "Cidade", "Situação"];
  const lines = rows.map((r) =>
    [
      r.created_at.slice(0, 10),
      r.name,
      r.business_name,
      r.whatsapp,
      r.segment ? segmentLabel(r.segment) : "",
      r.city ?? "",
      ACCESS_STATUS_LABELS[r.status as keyof typeof ACCESS_STATUS_LABELS] ?? r.status,
    ]
      .map(csvCell)
      .join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n") + "\r\n";
}
