/**
 * Textos das mensagens de WhatsApp. Os corpos vêm dos templates aprovados na Meta
 * (src/lib/whatsapp/templates.ts); aqui só montamos os parâmetros.
 * O texto de referência da confirmação está no CLAUDE.md §5.
 */
import { formatDate, formatTime, formatWeekday } from "@/lib/dates";
import { WHATSAPP_TEMPLATES, fillTemplate } from "@/lib/whatsapp/templates";

export type MessageVars = {
  customerName: string;
  businessName: string;
  serviceName: string;
  staffName: string;
  start: Date;
  timezone: string;
  /** Link de remarcar/cancelar (Pro) ou da página do negócio. */
  link: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function parts(v: MessageVars) {
  return {
    nome: firstName(v.customerName),
    negocio: v.businessName,
    servico: v.serviceName,
    profissional: v.staffName,
    dia_semana: formatWeekday(v.start, v.timezone),
    data: formatDate(v.start, v.timezone).slice(0, 5),
    hora: formatTime(v.start, v.timezone),
    link: v.link,
  };
}

export function confirmationText(v: MessageVars): string {
  return fillTemplate(WHATSAPP_TEMPLATES.confirmation.body, templateParams("confirmation", v));
}

export function reminderText(v: MessageVars): string {
  return fillTemplate(WHATSAPP_TEMPLATES.reminder.body, templateParams("reminder", v));
}

export function cancellationText(
  v: Omit<MessageVars, "staffName"> & { staffName?: string },
): string {
  return fillTemplate(
    WHATSAPP_TEMPLATES.cancellation.body,
    templateParams("cancellation", { ...v, staffName: v.staffName ?? "" }),
  );
}

/** Parâmetros na ordem dos templates aprovados na Meta (corpo {{1}}…{{8}}). */
export function templateParams(
  kind: "confirmation" | "reminder" | "cancellation",
  v: MessageVars,
): string[] {
  const p = parts(v);
  if (kind === "cancellation")
    return [p.nome, p.servico, p.negocio, p.dia_semana, p.data, p.hora, p.link];
  return [p.nome, p.negocio, p.servico, p.profissional, p.dia_semana, p.data, p.hora, p.link];
}

export const TEMPLATE_NAMES = {
  confirmation: WHATSAPP_TEMPLATES.confirmation.name,
  reminder: WHATSAPP_TEMPLATES.reminder.name,
  cancellation: WHATSAPP_TEMPLATES.cancellation.name,
} as const;
