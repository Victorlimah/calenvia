/** Programa de indicação (CAL-109). */
export function normalizeRefCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toLowerCase();
  return /^[a-z0-9]{6,12}$/.test(code) ? code : null;
}

/** Código curto e legível (sem 0/o/1/l para não confundir). */
export function newRefCode(random: () => number = Math.random): string {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => abc[Math.floor(random() * abc.length)]).join("");
}

export function referralShareText(businessName: string, link: string): string {
  return `Uso a Calenvia na ${businessName}: meus clientes agendam sozinhos pelo link e recebem a confirmação no WhatsApp. Cria a sua por aqui: ${link}`;
}
