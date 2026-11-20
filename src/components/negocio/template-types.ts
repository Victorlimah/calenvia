import type { Theme, SectionId } from "@/lib/themes/schema";
import type { TemplateMeta } from "@/lib/themes/template-meta";
import type { PageData } from "./page-data";

/** O que toda seção recebe (CAL-144): dados + tema + vizinhas (para ajustar o ritmo). */
export type SectionProps = {
  data: PageData;
  theme: Theme;
  prev?: SectionId;
  next?: SectionId;
};

export type SectionComponent = (props: SectionProps) => React.ReactNode;

/** Template = metadados + as seções que ele redesenha (as outras vêm da base). */
export type TemplateDefinition = {
  meta: TemplateMeta;
  sections?: Partial<Record<SectionId, SectionComponent>>;
  /** Classes extras na raiz da página (texturas, fundo do template). */
  rootClassName?: string;
};
