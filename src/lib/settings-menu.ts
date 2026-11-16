/** Menu de Ajustes do painel, em grupos (o teste E2E confere que cada link abre). */
import { can, type Permission, type Role } from "@/lib/permissions";

type Item = {
  href: string;
  title: string;
  desc: string;
  /** Permissão para ver o item (CAL-112). Sem `perm`, todo membro vê. */
  perm?: Permission;
  /** Só para quem tem o acesso ligado a um cadastro de profissional. */
  needsStaff?: boolean;
};

/**
 * Ajustes (CAL-119): só o que é geral, da conta e da plataforma. O que é do negócio (dados,
 * página, serviços, equipe, horários, pacotes) fica em "Meu negócio" (CAL-118).
 */
export const SETTINGS_MENU: { title: string; items: Item[] }[] = [
  {
    title: "Sua conta",
    items: [
      {
        href: "/ajustes/conta",
        title: "Conta",
        desc: "Seu nome, e-mail, senha e sair",
      },
      {
        href: "/ajustes/notificacoes",
        title: "Notificações",
        desc: "Aviso neste aparelho quando chegar agendamento novo",
      },
      {
        href: "/meus-horarios",
        needsStaff: true,
        title: "Meus horários",
        desc: "Seu horário de trabalho e seus bloqueios",
      },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      {
        href: "/ajustes/mensagens-automaticas",
        perm: "settings.manage",
        title: "Mensagens automáticas",
        desc: "Confirmação, lembrete (24 h ou 2 h) e cancelamento enviados sozinhos",
      },
      {
        href: "/ajustes/mensagens",
        perm: "settings.manage",
        title: "Textos pelo seu WhatsApp",
        desc: "Confirmação e lembrete que você mesmo envia",
      },
    ],
  },
  {
    title: "Plano e integrações",
    items: [
      {
        href: "/assinatura",
        perm: "billing.view",
        title: "Assinatura e cobrança",
        desc: "Plano, faturas e mensagens do mês",
      },
      {
        href: "/ajustes/dominio",
        perm: "settings.manage",
        title: "Domínio próprio",
        desc: "Sua página no seu endereço (Pro+)",
      },
      {
        href: "/ajustes/google-agenda",
        perm: "settings.manage",
        title: "Google Agenda e celular",
        desc: "Ver os agendamentos no calendário do celular",
      },
    ],
  },
  {
    title: "Ajuda",
    items: [
      {
        href: "/ajuda",
        title: "Ajuda e suporte",
        desc: "Dúvidas frequentes e fale com a gente",
      },
      {
        href: "/indicar",
        perm: "billing.manage",
        title: "Indique a Calenvia",
        desc: "Seu link de indicação e quem entrou",
      },
    ],
  },
];

/** Menu filtrado pelo papel do membro (grupos vazios somem). */
export function settingsMenuFor(member: { role: Role | string; staffMemberId: string | null }) {
  return SETTINGS_MENU.map((g) => ({
    ...g,
    items: g.items.filter(
      (i) => (!i.perm || can(member, i.perm)) && (!i.needsStaff || member.staffMemberId !== null),
    ),
  })).filter((g) => g.items.length > 0);
}
