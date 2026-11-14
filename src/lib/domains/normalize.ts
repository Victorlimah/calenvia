/** Domínio próprio (CAL-099): normalização e validação do que o dono digita. */
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

/** Mensagem de erro em pt-BR, ou null se o domínio pode ser usado. */
export function validateDomain(domain: string, rootDomain: string): string | null {
  if (!domain) return "Informe o domínio.";
  if (domain.length > 253) return "Domínio muito longo.";
  const labels = domain.split(".");
  if (labels.length < 2) return "Use o domínio completo, por exemplo: agenda.seunegocio.com.br";
  if (!labels.every((l) => LABEL.test(l)))
    return "Domínio inválido. Use só letras, números e hífen.";
  if (/^\d+$/.test(labels.at(-1)!)) return "Use um domínio, não um endereço IP.";
  const root = rootDomain.replace(/:\d+$/, "").toLowerCase();
  if (domain === root || domain.endsWith(`.${root}`))
    return "Esse já é um endereço da Calenvia. Use um domínio seu.";
  if (/(^|\.)(localhost|vercel\.app|supabase\.co)$/.test(domain)) return "Domínio não permitido.";
  return null;
}

/** Registros DNS que o dono precisa criar (Vercel). */
export function dnsInstructions(domain: string) {
  const isApex =
    domain.split(".").length === 2 ||
    (/\.(com|net|org)\.br$/.test(domain) && domain.split(".").length === 3);
  return isApex
    ? { type: "A" as const, name: "@", value: "76.76.21.21" }
    : { type: "CNAME" as const, name: domain.split(".")[0], value: "cname.vercel-dns.com" };
}
