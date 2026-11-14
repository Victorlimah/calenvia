import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";
import { COMPANY } from "@/lib/company";
import { DEFAULT_FAIR_USE_LIMIT, PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Termos de uso — Calenvia" };

const SECTIONS: LegalSection[] = [
  {
    title: "O que é a Calenvia",
    paragraphs: [
      "A Calenvia é um serviço de agendamento online para negócios que trabalham com horário marcado. O negócio assinante (você, “dono”) ganha uma página pública de agendamento, um painel para organizar a agenda e, conforme o plano, mensagens automáticas no WhatsApp dos clientes.",
      "Os clientes finais agendam pela página do negócio sem criar conta. A relação de atendimento (serviço, preço, pagamento do serviço) é entre o negócio e o cliente final; a Calenvia fornece a ferramenta.",
    ],
  },
  {
    title: "Conta e responsabilidades do dono",
    paragraphs: ["Ao criar uma conta, você se compromete a:"],
    items: [
      "informar dados verdadeiros do seu negócio e mantê-los atualizados;",
      "manter sua senha em segredo e avisar a Calenvia se suspeitar de uso indevido;",
      "cadastrar serviços, preços e horários corretos e honrar os agendamentos feitos pela sua página;",
      "usar os dados dos seus clientes só para atender e se comunicar sobre os agendamentos, respeitando a Lei Geral de Proteção de Dados (LGPD);",
      "não usar a Calenvia para enviar propaganda, spam ou qualquer conteúdo ilegal.",
    ],
  },
  {
    title: "Planos, mensagens e uso justo",
    paragraphs: [
      `O plano ${PLANS.basic.name} não envia mensagens automáticas: a confirmação é enviada por você, com a mensagem pronta. O plano ${PLANS.pro.name} inclui até ${PLANS.pro.monthlyMessages} mensagens automáticas por mês. O plano ${PLANS.pro_plus.name} tem mensagens ilimitadas com uso justo de até ${DEFAULT_FAIR_USE_LIMIT} mensagens por mês, que pode ser ajustado em acordo com a Calenvia.`,
      "Quando a cota do mês acaba, os agendamentos continuam normalmente e a confirmação volta a ser pelo seu WhatsApp até o início do mês seguinte.",
      "As mensagens são enviadas pela API oficial do WhatsApp, só com textos de utilidade (confirmação, lembrete e cancelamento). Clientes que pedirem para não receber deixam de receber.",
    ],
  },
  {
    title: "Pagamento, troca de plano e cancelamento",
    paragraphs: [
      "Os planos são cobrados mensalmente, pelo valor publicado no site no momento da contratação. Você pode trocar de plano quando quiser.",
      "Se o pagamento ficar em atraso, a Calenvia pode suspender a página de agendamento e as mensagens até a regularização. Os seus dados não são apagados durante a suspensão.",
      "As regras detalhadas de cobrança, fidelidade e cancelamento serão publicadas aqui junto com o pagamento online.",
    ],
  },
  {
    title: "Disponibilidade do serviço",
    paragraphs: [
      "Trabalhamos para manter a Calenvia no ar o tempo todo, mas podem ocorrer interrupções para manutenção ou por falhas de terceiros (hospedagem, WhatsApp, internet). Nesses casos, agimos para restabelecer o serviço o mais rápido possível.",
      "A entrega das mensagens depende do WhatsApp e do celular do cliente; a Calenvia não garante que toda mensagem seja lida.",
    ],
  },
  {
    title: "Seus dados e os dos seus clientes",
    paragraphs: [
      "Os dados cadastrados no painel são seus. A Calenvia trata os dados dos seus clientes em seu nome, só para operar o agendamento e as mensagens, conforme a Política de Privacidade.",
      "Você pode pedir a exportação ou a exclusão dos dados de um cliente a qualquer momento pelo painel.",
    ],
  },
  {
    title: "Encerramento",
    paragraphs: [
      "A Calenvia pode suspender ou encerrar contas que violem estes termos, com aviso prévio sempre que possível. Você pode encerrar sua conta quando quiser.",
    ],
  },
  {
    title: "Mudanças nestes termos",
    paragraphs: [
      "Se estes termos mudarem, avisaremos pelo painel ou por e-mail antes de a mudança valer. A data da versão atual está no topo desta página.",
    ],
  },
];

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos de uso"
      intro={`Estes termos explicam, em linguagem simples, as regras para usar a ${COMPANY.name}. Ao criar uma conta, você concorda com eles.`}
      sections={SECTIONS}
    />
  );
}
