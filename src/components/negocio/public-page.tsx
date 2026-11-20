import { getTemplate } from "@/lib/themes/registry";
import { orderedSections, resolveTheme } from "@/lib/themes/resolve";
import { duotoneTables } from "@/lib/themes/photo";
import type { Theme } from "@/lib/themes/schema";
import { BASE_SECTIONS, sectionHasContent } from "./base-sections";
import { BusinessMark } from "./business-mark";
import type { PageData } from "./page-data";
import { StickyCta } from "./sections";

/**
 * A página pública inteira a partir de dados + tema (CAL-144). A mesma árvore serve a página
 * real e a prévia do editor (CAL-148): o que a pessoa vê na prévia é o que vai ao ar.
 */
export function PublicPage({ data, theme }: { data: PageData; theme: Theme }) {
  const template = getTemplate(theme.templateId);
  const list = orderedSections(theme.sections).filter(
    (s) => s.visible && sectionHasContent(s.id, data),
  );
  const placements = data.logo.placements;
  const photo = theme.photoStyle ?? "none";
  // Duotone (CAL-147): sombras na cor escura do tema, luzes na cor clara.
  const c = resolveTheme(theme).colors;
  const tables =
    photo === "duotone"
      ? theme.palette.mode === "dark"
        ? duotoneTables(c.bg, c.primary)
        : duotoneTables(c.text, c.primarySoft)
      : null;
  return (
    <div className={template.rootClassName} data-template={template.meta.id} data-photo={photo}>
      {tables ? (
        <svg width="0" height="0" aria-hidden="true" className="absolute">
          <filter id="t-duotone" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={tables.r} />
              <feFuncG type="table" tableValues={tables.g} />
              <feFuncB type="table" tableValues={tables.b} />
            </feComponentTransfer>
          </filter>
        </svg>
      ) : null}
      {placements.includes("header") ? (
        <header className="border-b border-t-text/10 bg-t-bg">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
            <BusinessMark
              name={data.name}
              logoUrl={data.logo.url}
              shape={theme.logo.shape}
              size="sm"
            />
            <span className="truncate font-t-display font-bold">{data.name}</span>
          </div>
        </header>
      ) : null}
      {list.map((s, i) => {
        const Component = template.sections?.[s.id] ?? BASE_SECTIONS[s.id];
        return (
          <Component
            key={s.id}
            data={data}
            theme={theme}
            prev={list[i - 1]?.id}
            next={list[i + 1]?.id}
          />
        );
      })}
      <footer className="px-5 pt-6 pb-32 text-center text-xs text-t-sub">
        {placements.includes("footer") ? (
          <div className="mb-4 flex flex-col items-center gap-2">
            <BusinessMark
              name={data.name}
              logoUrl={data.logo.url}
              shape={theme.logo.shape}
              size="lg"
            />
            <p className="font-t-display text-base font-bold text-t-text">{data.name}</p>
          </div>
        ) : null}
        Agendamento online por{" "}
        <a href="https://calenvia.com.br" className="underline underline-offset-2">
          Calenvia
        </a>
      </footer>
      <StickyCta name={data.name} contained={data.preview} />
    </div>
  );
}
