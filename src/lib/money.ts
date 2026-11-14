/** 4000 → "R$ 40,00" */
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(cents / 100)
    .replace(/ /g, " ");
}

/** "40" | "40,5" | "1.234,90" | "R$ 40,00" → centavos. Retorna null se inválido. */
export function parsePriceToCents(input: string): number | null {
  const clean = input
    .replace(/R\$|\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (clean === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
