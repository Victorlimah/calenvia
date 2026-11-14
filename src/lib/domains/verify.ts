import "server-only";
import { resolve4, resolveCname } from "node:dns/promises";
import { dnsInstructions } from "./normalize";

export type DomainCheck = { ok: true } | { ok: false; error: string };

const VERCEL_IPS = ["76.76.21.21"];

/** Confere no DNS público se o domínio aponta para a Vercel (registro A ou CNAME). */
export async function checkDns(domain: string): Promise<DomainCheck> {
  const want = dnsInstructions(domain);
  try {
    if (want.type === "CNAME") {
      const cnames = await resolveCname(domain).catch(() => [] as string[]);
      if (cnames.some((c) => c.replace(/\.$/, "").endsWith("vercel-dns.com"))) return { ok: true };
    }
    const ips = await resolve4(domain).catch(() => [] as string[]);
    if (ips.some((ip) => VERCEL_IPS.includes(ip))) return { ok: true };
    return {
      ok: false,
      error: `O DNS ainda não aponta para a Calenvia. Crie o registro ${want.type} indicado (pode levar algumas horas para valer).`,
    };
  } catch {
    return { ok: false, error: "Não foi possível consultar o DNS agora. Tente de novo." };
  }
}

/**
 * Cadastra o domínio no projeto da Vercel (gera o certificado HTTPS). Só roda com
 * VERCEL_TOKEN e VERCEL_PROJECT_ID; sem eles, o domínio precisa ser adicionado à mão no painel.
 */
export async function addDomainToVercel(
  domain: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DomainCheck | null> {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return null;
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  const res = await fetchImpl(`https://api.vercel.com/v10/projects/${project}/domains${team}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  if (body.error?.code === "domain_already_in_use" || body.error?.code === "domain_already_exists")
    return { ok: true };
  return { ok: false, error: body.error?.message ?? `Vercel respondeu ${res.status}` };
}

export async function removeDomainFromVercel(domain: string, fetchImpl: typeof fetch = fetch) {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  if (!token || !project) return;
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  await fetchImpl(
    `https://api.vercel.com/v9/projects/${project}/domains/${encodeURIComponent(domain)}${team}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => {});
}
