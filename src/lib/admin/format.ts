/** Formatação das telas da administração (CAL-114). Horário de Brasília. */
const DATE = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatAdminDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatAdminDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "pending" || status === "past_due") return "warning";
  if (status === "suspended" || status === "canceled") return "danger";
  return "neutral";
}
