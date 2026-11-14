/** Caminhos do painel (já sem o prefixo /painel) que não exigem login. */
export const PUBLIC_APP_PATHS = ["/entrar", "/cadastro", "/recuperar-senha", "/auth/callback"];

export function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Só aceita caminhos internos ("/agenda"), nunca URLs externas ("//site.com", "https://…"). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
