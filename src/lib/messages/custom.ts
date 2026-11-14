/**
 * Textos personalizados das mensagens manuais (CAL-074). O dono escreve com variáveis
 * entre chaves; sem texto próprio, vale o padrão (mesmo corpo do template da Meta).
 */
import { formatDate, formatTime, formatWeekday } from "@/lib/dates";
import { confirmationText, reminderText, type MessageVars } from "./templates";

export type CustomKind = "confirmation" | "reminder";
export type MessageTexts = Partial<Record<CustomKind, string>>;

export const MAX_CUSTOM_TEXT = 700;

export const VARIABLES: { key: string; label: string }[] = [
  { key: "nome", label: "primeiro nome do cliente" },
  { key: "negocio", label: "nome do seu negócio" },
  { key: "servico", label: "serviço" },
  { key: "profissional", label: "profissional" },
  { key: "dia", label: "dia da semana" },
  { key: "data", label: "data (dd/mm)" },
  { key: "hora", label: "horário" },
  { key: "link", label: "link para remarcar/cancelar ou da sua página" },
];

export function defaultText(kind: CustomKind, v: MessageVars): string {
  return kind === "confirmation" ? confirmationText(v) : reminderText(v);
}

/** Texto padrão com as variáveis visíveis (para o editor começar dele). */
export const DEFAULT_TEMPLATES: Record<CustomKind, string> = {
  confirmation:
    "Olá, {nome}! Aqui é da *{negocio}*. Seu horário de *{servico}* com {profissional} está confirmado para *{dia}, {data} às {hora}*. Para remarcar ou cancelar: {link}\n\nAté lá!",
  reminder:
    "Olá, {nome}! Lembrete da *{negocio}*: seu horário de *{servico}* com {profissional} é *{dia}, {data} às {hora}*. Se precisar remarcar ou cancelar: {link}\n\nTe esperamos!",
};

export function fillCustom(template: string, v: MessageVars): string {
  const values: Record<string, string> = {
    nome: v.customerName.trim().split(/\s+/)[0] ?? v.customerName,
    negocio: v.businessName,
    servico: v.serviceName,
    profissional: v.staffName,
    dia: formatWeekday(v.start, v.timezone),
    data: formatDate(v.start, v.timezone).slice(0, 5),
    hora: formatTime(v.start, v.timezone),
    link: v.link,
  };
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

/** Erros do texto (pt-BR) ou null. */
export function validateCustomText(text: string): string | null {
  const t = text.trim();
  if (t.length < 10) return "Escreva pelo menos uma frase.";
  if (t.length > MAX_CUSTOM_TEXT) return `Use no máximo ${MAX_CUSTOM_TEXT} caracteres.`;
  const unknown = [...t.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .filter((k) => !VARIABLES.some((v) => v.key === k));
  if (unknown.length) return `Variável desconhecida: {${unknown[0]}}.`;
  return null;
}

/** Texto final: o personalizado do negócio, se houver; senão o padrão. */
export function messageFor(kind: CustomKind, texts: unknown, v: MessageVars): string {
  const custom = (texts as MessageTexts | null)?.[kind];
  return custom && !validateCustomText(custom) ? fillCustom(custom, v) : defaultText(kind, v);
}
