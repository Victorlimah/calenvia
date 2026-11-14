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

export const SETTINGS_MENU: { title: string; items: Item[] }[] = [
  {
    title: "Equipe",
    items: [
      {
        href: "/ajustes/equipe",
        perm: "team.manage",
        title: "Equipe e acessos",
        desc: "Convidar pessoas e definir o que cada uma pode ver",
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
    title: "Sua página",
    items: [
      {
        href: "/ajustes/link",
        perm: "settings.manage",
        title: "Link da página",
        desc: "Copiar, ver a página e dica para o Instagram",
      },
      {
        href: "/ajustes/negocio",
        perm: "settings.manage",
        title: "Dados do negócio",
        desc: "Nome, endereço, WhatsApp e endereço da página",
      },
      {
        href: "/ajustes/aparencia",
        perm: "settings.manage",
        title: "Aparência da página",
        desc: "Logo, capa, cor e textos",
      },
      {
        href: "/ajustes/dominio",
        perm: "settings.manage",
        title: "Domínio próprio",
        desc: "Sua página no seu endereço (Pro+)",
      },
    ],
  },
  {
    title: "Agenda",
    items: [
      {
        href: "/ajustes/servicos",
        perm: "settings.manage",
        title: "Serviços",
        desc: "Duração, preço e “mais pedido”",
      },
      {
        href: "/ajustes/pacotes",
        perm: "finance.view",
        title: "Pacotes",
        desc: "Várias sessões de um serviço com desconto",
      },
      {
        href: "/ajustes/profissionais",
        perm: "settings.manage",
        title: "Profissionais",
        desc: "Equipe, serviços e horário de cada um",
      },
      {
        href: "/ajustes/horarios",
        perm: "settings.manage",
        title: "Horário de funcionamento",
        desc: "Dias, horários e intervalos",
      },
      {
        href: "/ajustes/regras",
        perm: "settings.manage",
        title: "Regras da agenda",
        desc: "Antecedência, dias à frente e intervalo",
      },
      {
        href: "/ajustes/google-agenda",
        perm: "settings.manage",
        title: "Google Agenda e celular",
        desc: "Ver os agendamentos no seu calendário",
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
        desc: "Confirmação, lembrete (24 h ou 2 h) e cancelamento",
      },
      {
        href: "/ajustes/mensagens",
        perm: "settings.manage",
        title: "Textos pelo seu WhatsApp",
        desc: "Confirmação e lembrete que você envia",
      },
    ],
  },
  {
    title: "Negócio",
    items: [
      {
        href: "/financeiro",
        perm: "finance.view",
        title: "Financeiro",
        desc: "Despesas, receitas e saldo do mês",
      },
      {
        href: "/relatorios",
        perm: "finance.view",
        title: "Relatórios",
        desc: "Faturamento, faltas e melhores clientes (Pro+)",
      },
      {
        href: "/avaliacoes",
        perm: "settings.manage",
        title: "Avaliações",
        desc: "Notas dos clientes e depoimentos da página",
      },
    ],
  },
  {
    title: "Conta",
    items: [
      {
        href: "/assinatura",
        perm: "billing.manage",
        title: "Assinatura",
        desc: "Plano, faturas e mensagens do mês",
      },
      {
        href: "/indicar",
        perm: "billing.manage",
        title: "Indique a Calenvia",
        desc: "Seu link de indicação e quem entrou",
      },
      { href: "/ajuda", title: "Ajuda", desc: "Dúvidas frequentes e fale com a gente" },
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
