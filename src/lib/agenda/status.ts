export const STATUS_LABELS = {
  confirmed: "Confirmado",
  completed: "Concluído",
  no_show: "Faltou",
  canceled: "Cancelado",
} as const;

export const STATUS_TONES = {
  confirmed: "brand",
  completed: "success",
  no_show: "warning",
  canceled: "neutral",
} as const;
