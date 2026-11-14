/**
 * Textos das mensagens de WhatsApp (versionados no código — CAL-067).
 * O texto de referência da confirmação está no CLAUDE.md §5.
 */
import { formatDate, formatTime, formatWeekday } from "@/lib/dates";

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
  const p = parts(v);
  return `Olá, ${p.nome}! Aqui é da *${p.negocio}*. Seu horário de *${p.servico}* com ${p.profissional} está confirmado para *${p.dia_semana}, ${p.data} às ${p.hora}*. Para remarcar ou cancelar: ${p.link}`;
}

export function reminderText(v: MessageVars): string {
  const p = parts(v);
  return `Olá, ${p.nome}! Lembrete da *${p.negocio}*: seu horário de *${p.servico}* com ${p.profissional} é *${p.dia_semana}, ${p.data} às ${p.hora}*. Se precisar remarcar ou cancelar: ${p.link}`;
}

export function cancellationText(
  v: Omit<MessageVars, "staffName"> & { staffName?: string },
): string {
  const p = parts({ ...v, staffName: v.staffName ?? "" });
  return `Olá, ${p.nome}. Seu horário de *${p.servico}* na *${p.negocio}* em *${p.dia_semana}, ${p.data} às ${p.hora}* foi cancelado. Para agendar de novo: ${p.link}`;
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
  confirmation: "calenvia_confirmacao_v1",
  reminder: "calenvia_lembrete_v1",
  cancellation: "calenvia_cancelamento_v1",
} as const;
