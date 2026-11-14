import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/site/legal-page";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "Política de privacidade — Calenvia" };

const SECTIONS: LegalSection[] = [
  {
    title: "Quem somos e a quem esta política se aplica",
    paragraphs: [
      `A ${COMPANY.name} oferece páginas de agendamento para negócios. Esta política vale para os donos de negócio que usam o painel e para os clientes finais que agendam pelas páginas.`,
      "Para os dados dos donos, a Calenvia é a controladora. Para os dados dos clientes finais, o controlador é o negócio onde o cliente agendou, e a Calenvia atua como operadora, tratando os dados em nome dele.",
    ],
  },
  {
    title: "Quais dados coletamos",
    paragraphs: ["Coletamos só o necessário para o agendamento funcionar:"],
    items: [
      "Dono do negócio: nome, e-mail, senha (guardada de forma criptografada) e os dados do negócio (nome, endereço, WhatsApp, fotos, serviços, horários).",
      "Cliente final: nome, número de WhatsApp, serviço, profissional, data e horário escolhidos e, se o negócio anotar, observações sobre o atendimento.",
      "Mensagens: registro das confirmações, lembretes e cancelamentos enviados (tipo, horário e situação de entrega).",
      "Dados técnicos: endereço IP e informações do navegador, usados para segurança e para evitar abuso.",
    ],
  },
  {
    title: "Para que usamos",
    paragraphs: [],
    items: [
      "Registrar o agendamento e mostrá-lo na agenda do negócio.",
      "Enviar confirmação, lembrete e aviso de cancelamento pelo WhatsApp (nos planos com mensagens automáticas).",
      "Permitir que o cliente remarque ou cancele pelo link recebido.",
      "Manter o serviço seguro, prevenir fraude e cumprir obrigações legais.",
    ],
  },
  {
    title: "Base legal",
    paragraphs: [
      "Tratamos os dados para executar o serviço contratado (agendamento), com base no legítimo interesse para segurança e prevenção de abuso, e para cumprir obrigações legais, conforme a Lei nº 13.709/2018 (LGPD).",
    ],
  },
  {
    title: "Com quem compartilhamos",
    paragraphs: [
      "Não vendemos dados. Compartilhamos só com fornecedores necessários para o serviço funcionar: hospedagem e banco de dados, a Meta (WhatsApp Business), para entregar as mensagens, e o processador de pagamentos, para a assinatura dos donos.",
    ],
  },
  {
    title: "Por quanto tempo guardamos",
    paragraphs: [
      "Os dados ficam guardados enquanto o negócio usar a Calenvia. Quando o negócio encerra a conta ou pede a exclusão de um cliente, apagamos os dados, exceto o que a lei exigir manter.",
    ],
  },
  {
    title: "Seus direitos",
    paragraphs: [
      "Você pode pedir acesso, correção, exportação ou exclusão dos seus dados. Clientes finais podem fazer o pedido ao negócio onde agendaram ou diretamente à Calenvia, que encaminha ao negócio.",
      "Para não receber mais mensagens automáticas no WhatsApp, basta responder SAIR a qualquer mensagem.",
    ],
  },
  {
    title: "Segurança",
    paragraphs: [
      "Usamos conexão criptografada (HTTPS), controle de acesso por negócio (um negócio nunca vê os dados de outro) e senhas criptografadas. Nenhum sistema é 100% imune, mas agimos rápido e avisamos os afetados em caso de incidente.",
    ],
  },
  {
    title: "Contato",
    paragraphs: [`Para qualquer pedido sobre seus dados, escreva para ${COMPANY.privacyEmail}.`],
  },
];

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de privacidade"
      intro="Esta política explica quais dados a Calenvia coleta, para que usa, com quem compartilha e como você exerce seus direitos."
      sections={SECTIONS}
    />
  );
}
