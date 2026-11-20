/**
 * Menu do /admin (CAL-129), em grupos: Clientes · Dinheiro · Saúde. Função pura do item ativo,
 * testada em nav.test.ts.
 */
export type AdminCounter = "pending" | "invites" | "billing" | "support" | "failed";

export type AdminNavItem = { href: string; label: string; counter?: AdminCounter };

export const ADMIN_NAV: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "Clientes",
    items: [
      { href: "/admin", label: "Negócios", counter: "pending" },
      { href: "/admin/convites", label: "Convites", counter: "invites" },
      { href: "/admin/suporte", label: "Suporte", counter: "support" },
    ],
  },
  {
    title: "Dinheiro",
    items: [
      { href: "/admin/assinaturas", label: "Assinaturas", counter: "billing" },
      { href: "/admin/precos", label: "Preços" },
    ],
  },
  {
    title: "Saúde",
    items: [
      { href: "/admin/metricas", label: "Métricas" },
      { href: "/admin/mensagens", label: "Mensagens", counter: "failed" },
    ],
  },
];

export const COUNTER_LABELS: Record<AdminCounter, [string, string]> = {
  pending: ["negócio aguardando liberação", "negócios aguardando liberação"],
  invites: ["convite pendente", "convites pendentes"],
  billing: ["assinatura com problema", "assinaturas com problema"],
  support: ["pedido aberto", "pedidos abertos"],
  failed: ["mensagem com falha na semana", "mensagens com falha na semana"],
};

/** Item ativo: "/admin/negocios/…" acende Negócios; o resto, pelo prefixo. */
export function activeAdminHref(pathname: string): string | null {
  const p = pathname.replace(/^\/painel(?=\/|$)/, "");
  if (p === "/admin" || p.startsWith("/admin/negocios")) return "/admin";
  for (const g of ADMIN_NAV) {
    for (const i of g.items) {
      if (i.href !== "/admin" && (p === i.href || p.startsWith(`${i.href}/`))) return i.href;
    }
  }
  return null;
}
