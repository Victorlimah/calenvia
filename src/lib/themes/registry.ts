/**
 * Registro central dos templates (CAL-144). Para criar um template: pasta em
 * src/lib/themes/templates/{id}/ com o `TemplateDefinition` e uma linha aqui. Ele entra sozinho
 * na galeria e na varredura de testes (temas.spec.ts).
 */
import type { TemplateDefinition } from "@/components/negocio/template-types";
import { noturno } from "./templates/noturno";

export const TEMPLATES: TemplateDefinition[] = [noturno];

export const DEFAULT_TEMPLATE_ID = "noturno";

/** Template pelo id; desconhecido cai no padrão (Noturno), sem quebrar a página. */
export function getTemplate(id: string | null | undefined): TemplateDefinition {
  return TEMPLATES.find((t) => t.meta.id === id) ?? TEMPLATES[0];
}
