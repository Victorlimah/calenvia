import { themeFromTemplate } from "@/lib/themes/apply";
import { fontPairVars } from "@/lib/themes/font-pairs";
import { ALL_FONT_CLASSNAMES } from "@/lib/themes/fonts";
import { getTemplate } from "@/lib/themes/registry";
import { resolveTheme } from "@/lib/themes/resolve";

/**
 * "Veja como fica" (CAL-151): miniaturas dos templates reais da galeria (cores, fontes e
 * cantos de verdade), cada um com um negócio de exemplo de um segmento diferente.
 */
const EXAMPLES = [
  { id: "delicado", name: "Studio Bela", segment: "Salão de beleza" },
  { id: "clinico", name: "Clínica Vida", segment: "Fisioterapia" },
  { id: "alegre", name: "Pet Feliz", segment: "Pet shop" },
  { id: "natureza", name: "Espaço Equilíbrio", segment: "Pilates e yoga" },
  { id: "floral", name: "Ateliê das Unhas", segment: "Manicure" },
  { id: "noturno", name: "Barbearia Central", segment: "Barbearia" },
];

export function TemplatesShowcase() {
  return (
    <ul className={`showcase ${ALL_FONT_CLASSNAMES}`} aria-label="Exemplos de temas">
      {EXAMPLES.map((ex) => {
        const meta = getTemplate(ex.id).meta;
        const c = resolveTheme(themeFromTemplate(meta, { accent: "#E8B04A" })).colors;
        const fonts = fontPairVars(meta.fontPairId);
        const radius = meta.radius === "square" ? 4 : meta.radius === "round" ? 999 : 12;
        return (
          <li key={ex.id} className="show-card reveal">
            <div
              className="show-top"
              style={{ background: c.bg, color: c.text, fontFamily: fonts["--t-font-body"] }}
            >
              <span className="show-name" style={{ fontFamily: fonts["--t-font-display"] }}>
                {ex.name}
              </span>
              <span className="show-seg" style={{ color: c.sub }}>
                {ex.segment}
              </span>
              <span
                className="show-btn"
                style={{ background: c.primary, color: c.primaryFg, borderRadius: radius }}
              >
                Agendar meu horário
              </span>
            </div>
            <div className="show-info">
              <b>{meta.name}</b>
              <span>{meta.description}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
