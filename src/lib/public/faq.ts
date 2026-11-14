import { canManageByLink, canSendAutomaticMessages } from "@/lib/plans";

export function noticeText(minutes: number): string {
  if (minutes <= 0) return "sem antecedência mínima";
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return h === 1 ? "1 hora" : `${h} horas`;
  }
  const d = Math.round(minutes / 1440);
  return d === 1 ? "1 dia" : `${d} dias`;
}

type FaqBusiness = {
  name: string;
  plan: string;
  plan_status: string;
  min_notice_min: number;
  max_days_ahead: number;
  cancel_notice_min: number;
  address: string | null;
};

/** Perguntas frequentes geradas a partir das regras do negócio. */
export function buildFaq(b: FaqBusiness): { q: string; a: string }[] {
  const faq = [
    {
      q: "Preciso criar conta ou baixar aplicativo?",
      a: "Não. Você escolhe o serviço e o horário, informa nome e WhatsApp e pronto.",
    },
    {
      q: "Como recebo a confirmação?",
      a: canSendAutomaticMessages(b)
        ? "A confirmação chega no seu WhatsApp na hora, e você recebe um lembrete antes do horário."
        : `Assim que você agenda, a ${b.name} confirma seu horário pelo WhatsApp.`,
    },
    {
      q: "Com quanta antecedência posso agendar?",
      a:
        b.min_notice_min > 0
          ? `Agende com pelo menos ${noticeText(b.min_notice_min)} de antecedência, para até ${b.max_days_ahead} dias à frente.`
          : `Você pode agendar para até ${b.max_days_ahead} dias à frente.`,
    },
    {
      q: "E se eu precisar remarcar ou cancelar?",
      a: canManageByLink(b)
        ? b.cancel_notice_min > 0
          ? `Use o link que chega na confirmação, até ${noticeText(b.cancel_notice_min)} antes do horário.`
          : "Use o link que chega na confirmação, até a hora do atendimento."
        : `Fale com a ${b.name} pelo WhatsApp que ajudamos você a remarcar.`,
    },
  ];
  if (b.address) faq.push({ q: "Onde fica?", a: b.address });
  return faq;
}
