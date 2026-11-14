import { NextResponse, type NextRequest } from "next/server";
import { HOST_KIND_HEADER, HOST_SLUG_HEADER } from "@/lib/host-headers";
import { appUrl, resolveHost, rewritePath } from "@/lib/hosts";

export async function middleware(request: NextRequest) {
  const host = resolveHost(request.headers.get("host"));
  const { pathname, search } = request.nextUrl;

  // Cabeçalhos internos: sempre sobrescritos aqui (o navegador não consegue forjar).
  const headers = new Headers(request.headers);
  headers.set(HOST_KIND_HEADER, host.kind);
  if (host.kind === "business") headers.set(HOST_SLUG_HEADER, host.slug);
  else headers.delete(HOST_SLUG_HEADER);

  // API e arquivos internos não mudam de caminho.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request: { headers } });
  }

  // No site, /painel leva para o subdomínio do painel.
  if (host.kind === "site" && (pathname === "/painel" || pathname.startsWith("/painel/"))) {
    return NextResponse.redirect(appUrl(pathname.replace(/^\/painel/, "") || "/") + search);
  }

  const target = rewritePath(host, pathname);
  if (target && target !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
