/** Menu de Ajustes do painel, em grupos (o teste E2E confere que cada link abre). */
type Item = { href: string; title: string; desc: string };

export const SETTINGS_MENU: { title: string; items: Item[] }[] = [
  {
    title: "Sua página",
    items: [
      {
        href: "/ajustes/link",
        title: "Link da página",
        desc: "Copiar, ver a página e dica para o Instagram",
      },
      {
        href: "/ajustes/negocio",
        title: "Dados do negócio",
        desc: "Nome, endereço, WhatsApp e endereço da página",
      },
      {
        href: "/ajustes/aparencia",
        title: "Aparência da página",
        desc: "Logo, capa, cor e textos",
      },
      {
        href: "/ajustes/dominio",
        title: "Domínio próprio",
        desc: "Sua página no seu endereço (Pro+)",
      },
    ],
  },
  {
    title: "Agenda",
    items: [
      { href: "/ajustes/servicos", title: "Serviços", desc: "Duração, preço e “mais pedido”" },
      {
        href: "/ajustes/pacotes",
        title: "Pacotes",
        desc: "Várias sessões de um serviço com desconto",
      },
      {
        href: "/ajustes/profissionais",
        title: "Profissionais",
        desc: "Equipe, serviços e horário de cada um",
      },
      {
        href: "/ajustes/horarios",
        title: "Horário de funcionamento",
        desc: "Dias, horários e intervalos",
      },
      {
        href: "/ajustes/regras",
        title: "Regras da agenda",
        desc: "Antecedência, dias à frente e intervalo",
      },
      {
        href: "/ajustes/google-agenda",
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
        title: "Mensagens automáticas",
        desc: "Confirmação, lembrete (24 h ou 2 h) e cancelamento",
      },
      {
        href: "/ajustes/mensagens",
        title: "Textos pelo seu WhatsApp",
        desc: "Confirmação e lembrete que você envia",
      },
    ],
  },
  {
    title: "Negócio",
    items: [
      { href: "/financeiro", title: "Financeiro", desc: "Despesas, receitas e saldo do mês" },
      {
        href: "/relatorios",
        title: "Relatórios",
        desc: "Faturamento, faltas e melhores clientes (Pro+)",
      },
      {
        href: "/avaliacoes",
        title: "Avaliações",
        desc: "Notas dos clientes e depoimentos da página",
      },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/assinatura", title: "Assinatura", desc: "Plano, faturas e mensagens do mês" },
      {
        href: "/indicar",
        title: "Indique a Calenvia",
        desc: "Seu link de indicação e quem entrou",
      },
      { href: "/ajuda", title: "Ajuda", desc: "Dúvidas frequentes e fale com a gente" },
    ],
  },
];
