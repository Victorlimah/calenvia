/**
 * WhatsApp no Brasil: guardamos só dígitos, com 55 na frente.
 * Celular: 55 + DDD (2) + 9 dígitos (começando com 9) = 13 dígitos.
 * Fixo (aceito só para o WhatsApp do negócio): 55 + DDD + 8 dígitos = 12 dígitos.
 */

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normaliza o que a pessoa digitou para 55 + DDD + número.
 * Aceita "(85) 9 9999-0000", "085999990000", "+55 85 99999-0000", e celular antigo sem o 9.
 * Retorna null se não der para entender como telefone brasileiro.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let d = onlyDigits(input);
  if (d.startsWith("00")) d = d.slice(2); // 0055...
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0") && !d.startsWith("00")) d = d.slice(1); // 085 9999-0000 (fixo com 0)
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1); // 085 9 9999-0000
  if (d.length !== 10 && d.length !== 11) return null;

  const ddd = Number(d.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) return null;
  let number = d.slice(2);

  if (number.length === 9 && number[0] !== "9") return null;
  // Celular no formato antigo (8 dígitos começando com 6–9): acrescenta o 9.
  if (number.length === 8 && /^[6-9]/.test(number)) number = `9${number}`;
  return `55${d.slice(0, 2)}${number}`;
}

/** Celular válido (o que o cliente final precisa informar). */
export function normalizeMobile(input: string | null | undefined): string | null {
  const n = normalizePhone(input);
  return n && n.length === 13 ? n : null;
}

export function isValidMobile(input: string | null | undefined): boolean {
  return normalizeMobile(input) !== null;
}

/** Número de mentira (DDD 00 não existe) do "cliente avulso": quem não deixou WhatsApp. */
export const WALK_IN_PHONE = "5500000000000";

/** 5585999990000 → "(85) 9 9999-0000"; 558532221111 → "(85) 3222-1111" */
export function formatPhone(normalized: string): string {
  if (normalized === WALK_IN_PHONE) return "Sem WhatsApp";
  const d = onlyDigits(normalized).replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return normalized;
}

/** Máscara enquanto digita: (00) 0 0000-0000 */
export function maskPhoneInput(value: string): string {
  const d = onlyDigits(value)
    .replace(/^55(?=\d{11})/, "")
    .slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
}

/** Link wa.me com mensagem pronta. */
export function waMeLink(normalized: string, text?: string): string {
  const base = `https://wa.me/${onlyDigits(normalized)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
