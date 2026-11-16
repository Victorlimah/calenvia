/**
 * Menu principal do painel (CAL-117). Único lugar com os itens, quem vê cada um e qual item fica
 * ativo em cada rota. Funções puras, testadas em painel-nav.test.ts.
 *
 * - Computador (menu lateral): Início · Agenda · Clientes · Financeiro · Meu negócio · Ajustes.
 * - Celular (barra inferior): Início · Agenda · Clientes · Meu negócio · Ajustes. O Financeiro
 *   vira uma aba dentro do Início (o item Início fica ativo nas telas do Financeiro).
 */
import { can, type MemberLike, type Permission } from "@/lib/permissions";

export type NavKey = "inicio" | "agenda" | "clientes" | "financeiro" | "negocio" | "ajustes";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  /** Precisa de pelo menos uma destas permissões (vazio = todo membro vê). */
  anyOf: Permission[];
  /** Aparece na barra inferior do celular. */
  mobile: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "inicio", href: "/", label: "Início", anyOf: [], mobile: true },
  { key: "agenda", href: "/agenda", label: "Agenda", anyOf: [], mobile: true },
  { key: "clientes", href: "/clientes", label: "Clientes", anyOf: [], mobile: true },
  {
    key: "financeiro",
    href: "/financeiro",
    label: "Financeiro",
    anyOf: ["finance.view"],
    mobile: false,
  },
  {
    key: "negocio",
    href: "/negocio",
    label: "Meu negócio",
    anyOf: ["settings.manage", "team.manage", "finance.view"],
    mobile: true,
  },
  { key: "ajustes", href: "/ajustes", label: "Ajustes", anyOf: [], mobile: true },
];

/** Itens que o membro pode ver, na ordem do menu. */
export function navItemsFor(member: MemberLike, device: "desktop" | "mobile"): NavItem[] {
  return NAV_ITEMS.filter(
    (i) =>
      (device === "desktop" || i.mobile) &&
      (i.anyOf.length === 0 || i.anyOf.some((p) => can(member, p))),
  );
}

const starts = (p: string, ...prefixes: string[]) =>
  prefixes.some((x) => p === x || p.startsWith(`${x}/`) || p.startsWith(`${x}?`));

/**
 * Item ativo para a rota (sem o prefixo /painel). No celular, as telas do Financeiro acendem o
 * Início, porque lá o Financeiro é uma aba do Início.
 */
export function activeNavKey(pathname: string, device: "desktop" | "mobile"): NavKey | null {
  const p = pathname.replace(/^\/painel(?=\/|$)/, "") || "/";
  if (p === "/") return "inicio";
  if (starts(p, "/financeiro", "/relatorios")) return device === "mobile" ? "inicio" : "financeiro";
  if (starts(p, "/agenda", "/agendamento", "/novo", "/registrar", "/bloquear")) return "agenda";
  if (starts(p, "/clientes")) return "clientes";
  if (starts(p, "/negocio", "/avaliacoes")) return "negocio";
  if (starts(p, "/ajustes", "/assinatura", "/ajuda", "/indicar", "/meus-horarios")) {
    return "ajustes";
  }
  return null;
}

/** Abas de "Meu negócio" (CAL-118). */
export type Tab = { href: string; label: string; anyOf: Permission[]; also?: string[] };

export const NEGOCIO_TABS: Tab[] = [
  {
    href: "/negocio",
    label: "Dados e página",
    anyOf: ["settings.manage"],
    also: ["/negocio/aparencia", "/negocio/avaliacoes"],
  },
  { href: "/negocio/servicos", label: "Serviços e valores", anyOf: ["settings.manage"] },
  { href: "/negocio/equipe", label: "Equipe", anyOf: ["settings.manage", "team.manage"] },
  { href: "/negocio/horarios", label: "Horários", anyOf: ["settings.manage"] },
  { href: "/negocio/pacotes", label: "Pacotes", anyOf: ["finance.view"] },
];

export function tabsFor<T extends Tab>(tabs: T[], member: MemberLike): T[] {
  return tabs.filter((t) => t.anyOf.length === 0 || t.anyOf.some((p) => can(member, p)));
}

/** Aba ativa: a de prefixo mais longo que casa com a rota (ou com uma das rotas extras). */
export function activeTab<T extends Tab>(tabs: T[], pathname: string): T | null {
  const p = pathname.replace(/^\/painel(?=\/|$)/, "") || "/";
  let best: T | null = null;
  let bestLen = -1;
  for (const t of tabs) {
    for (const href of [t.href, ...(t.also ?? [])]) {
      if ((p === href || p.startsWith(`${href}/`)) && href.length > bestLen) {
        best = t;
        bestLen = href.length;
      }
    }
  }
  return best;
}

/** Abas do Financeiro (CAL-127). Todas exigem finance.view (o layout já checa). */
export const FINANCE_TABS: Tab[] = [
  { href: "/financeiro", label: "Resumo", anyOf: ["finance.view"] },
  { href: "/financeiro/lancamentos", label: "Entradas e despesas", anyOf: ["finance.view"] },
  { href: "/financeiro/relatorios", label: "Relatórios", anyOf: ["finance.view"] },
  { href: "/financeiro/exportar", label: "Exportar", anyOf: ["finance.view"] },
];
