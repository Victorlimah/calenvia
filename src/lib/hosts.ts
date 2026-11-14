/**
 * Regras de host/subdomínio (CLAUDE.md §3).
 *   calenvia.com.br          → site
 *   app.calenvia.com.br      → painel do dono
 *   {slug}.calenvia.com.br   → página pública do negócio
 *   outro domínio            → domínio próprio (Pro+, futuro)
 */

export const RESERVED_SLUGS = [
  "www",
  "app",
  "api",
  "admin",
  "painel",
  "site",
  "blog",
  "ajuda",
  "suporte",
  "status",
  "mail",
] as const;

export const APP_SUBDOMAIN = "app";

export type HostKind =
  | { kind: "site" }
  | { kind: "app" }
  | { kind: "business"; slug: string }
  | { kind: "custom"; domain: string }
  | { kind: "unknown" };

export function rootDomain(): string {
  return (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

const SLUG_SHAPE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Formato válido de slug (3 a 40 caracteres, minúsculas, números e hífen). */
export function isSlugShape(slug: string): boolean {
  return SLUG_SHAPE.test(slug) && !slug.includes("--");
}

function stripPort(host: string): string {
  return host.replace(/:\d+$/, "");
}

/** Descobre o que o host representa. Função pura: o domínio raiz é parâmetro. */
export function resolveHost(
  rawHost: string | null | undefined,
  root: string = rootDomain(),
): HostKind {
  if (!rawHost) return { kind: "unknown" };
  const host = rawHost.trim().toLowerCase().replace(/\.$/, "");
  const rootHost = root.toLowerCase();

  // Compara com e sem porta (em produção não há porta; em dev, localhost:3000).
  const sameRoot = (h: string) => h === rootHost || stripPort(h) === stripPort(rootHost);

  if (sameRoot(host)) return { kind: "site" };

  const suffix = `.${stripPort(rootHost)}`;
  const hostNoPort = stripPort(host);
  if (hostNoPort.endsWith(suffix)) {
    const sub = hostNoPort.slice(0, -suffix.length);
    if (sub === "www") return { kind: "site" };
    if (sub === APP_SUBDOMAIN) return { kind: "app" };
    if (sub.includes(".") || isReservedSlug(sub) || !isSlugShape(sub)) return { kind: "unknown" };
    return { kind: "business", slug: sub };
  }

  if (hostNoPort === "localhost" || hostNoPort === "127.0.0.1") return { kind: "site" };
  return { kind: "custom", domain: hostNoPort };
}

function protocol(root: string): string {
  return /localhost|127\.0\.0\.1/.test(root) ? "http" : "https";
}

/** URL do site (calenvia.com.br). */
export function siteUrl(path = "/", root: string = rootDomain()): string {
  return `${protocol(root)}://${root}${path}`;
}

/** URL do painel (app.calenvia.com.br). */
export function appUrl(path = "/", root: string = rootDomain()): string {
  return `${protocol(root)}://${APP_SUBDOMAIN}.${root}${path}`;
}

/** URL pública do negócio ({slug}.calenvia.com.br). */
export function businessUrl(slug: string, path = "/", root: string = rootDomain()): string {
  return `${protocol(root)}://${slug}.${root}${path}`;
}

/** Endereço curto para exibir (sem protocolo): barbearia-do-ze.calenvia.com.br */
export function businessDisplayHost(slug: string, root: string = rootDomain()): string {
  return `${slug}.${root}`;
}

/** Para onde o middleware reescreve o caminho, conforme o host. */
export function rewritePath(host: HostKind, pathname: string): string | null {
  const clean = pathname === "/" ? "" : pathname;
  switch (host.kind) {
    case "app":
      return `/painel${clean}`;
    case "business":
      return `/${host.slug}${clean}`;
    default:
      return null;
  }
}
