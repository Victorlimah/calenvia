import { NextResponse, type NextRequest } from "next/server";
import { isPublicAppPath } from "@/lib/auth/paths";
import { HOST_KIND_HEADER, HOST_SLUG_HEADER } from "@/lib/host-headers";
import { appUrl, resolveHost, rewritePath } from "@/lib/hosts";
import { refreshSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = resolveHost(request.headers.get("host"));
  const { pathname, search } = request.nextUrl;

  // Cabeçalhos internos: sempre sobrescritos aqui (o navegador não consegue forjar).
  const headers = new Headers(request.headers);
  headers.set(HOST_KIND_HEADER, host.kind);
  if (host.kind === "business") headers.set(HOST_SLUG_HEADER, host.slug);
  else headers.delete(HOST_SLUG_HEADER);

  // API não muda de caminho.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request: { headers } });
  }

  // No site, /painel leva para o subdomínio do painel.
  if (host.kind === "site" && (pathname === "/painel" || pathname.startsWith("/painel/"))) {
    return NextResponse.redirect(appUrl(pathname.replace(/^\/painel/, "") || "/") + search);
  }

  const target = rewritePath(host, pathname);
  let response: NextResponse;
  if (target && target !== pathname) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    response = NextResponse.rewrite(url, { request: { headers } });
  } else {
    response = NextResponse.next({ request: { headers } });
  }

  // Painel: renova a sessão e exige login fora das rotas públicas.
  if (host.kind === "app") {
    const user = await refreshSession(request, response);
    if (!user && !isPublicAppPath(pathname)) {
      const login = request.nextUrl.clone();
      login.pathname = "/entrar";
      login.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
      const redirect = NextResponse.redirect(login);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw\\.js|offline\\.html|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
