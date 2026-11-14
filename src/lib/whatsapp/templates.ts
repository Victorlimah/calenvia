/**
 * Templates de utilidade da Calenvia na WhatsApp Cloud API (CAL-067).
 * Fonte única dos textos: a prévia, o link wa.me e o envio automático usam estes corpos.
 * Regras da Meta: categoria UTILITY, idioma pt_BR, o corpo não pode começar nem terminar
 * com variável, e cada variável precisa de exemplo.
 */
export type TemplateKind = "confirmation" | "reminder" | "cancellation";

export type TemplateDefinition = {
  name: string;
  language: "pt_BR";
  category: "UTILITY";
  body: string;
  /** Exemplos na ordem de {{1}}…{{n}} (exigidos no cadastro). */
  example: string[];
};

export const WHATSAPP_TEMPLATES: Record<TemplateKind, TemplateDefinition> = {
  confirmation: {
    name: "calenvia_confirmacao_v1",
    language: "pt_BR",
    category: "UTILITY",
    body: "Olá, {{1}}! Aqui é da *{{2}}*. Seu horário de *{{3}}* com {{4}} está confirmado para *{{5}}, {{6}} às {{7}}*. Para remarcar ou cancelar: {{8}}\n\nAté lá!",
    example: [
      "Lucas",
      "Barbearia do Zé",
      "Corte masculino",
      "Zé Carlos",
      "sábado",
      "21/11",
      "14:30",
      "https://barbearia-do-ze.calenvia.com.br/gerenciar/ABC234",
    ],
  },
  reminder: {
    name: "calenvia_lembrete_v1",
    language: "pt_BR",
    category: "UTILITY",
    body: "Olá, {{1}}! Lembrete da *{{2}}*: seu horário de *{{3}}* com {{4}} é *{{5}}, {{6}} às {{7}}*. Se precisar remarcar ou cancelar: {{8}}\n\nTe esperamos!",
    example: [
      "Lucas",
      "Barbearia do Zé",
      "Corte masculino",
      "Zé Carlos",
      "amanhã (sábado)",
      "21/11",
      "14:30",
      "https://barbearia-do-ze.calenvia.com.br/gerenciar/ABC234",
    ],
  },
  cancellation: {
    name: "calenvia_cancelamento_v1",
    language: "pt_BR",
    category: "UTILITY",
    body: "Olá, {{1}}. Seu horário de *{{2}}* na *{{3}}* em *{{4}}, {{5}} às {{6}}* foi cancelado. Para agendar de novo: {{7}}\n\nObrigado!",
    example: [
      "Lucas",
      "Corte masculino",
      "Barbearia do Zé",
      "sábado",
      "21/11",
      "14:30",
      "https://barbearia-do-ze.calenvia.com.br",
    ],
  },
};

/** Substitui {{n}} pelos parâmetros (1-based). */
export function fillTemplate(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}

export function countVariables(body: string): number {
  return new Set(body.match(/\{\{\d+\}\}/g) ?? []).size;
}

/** Payload para cadastrar o template pela API de gerenciamento da Meta. */
export function toMetaCreatePayload(t: TemplateDefinition) {
  return {
    name: t.name,
    language: t.language,
    category: t.category,
    components: [{ type: "BODY", text: t.body, example: { body_text: [t.example] } }],
  };
}
