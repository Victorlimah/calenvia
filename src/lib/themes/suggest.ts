/**
 * Sugestão de tema pelo segmento e "Surpreenda-me" (CAL-149). Funções puras.
 */
import { themeFromTemplate } from "./apply";
import { resolveTheme } from "./resolve";
import type { Theme } from "./schema";
import type { TemplateMeta } from "./template-meta";

/** Ordem da galeria: indicados para o segmento primeiro (na ordem do registro), depois o resto. */
export function sortTemplatesForSegment(
  metas: TemplateMeta[],
  segment: string | null | undefined,
): { order: string[]; recommended: string[] } {
  const recommended = metas
    .filter((m) => segment && m.segments.includes(segment as never))
    .map((m) => m.id);
  const rest = metas.filter((m) => !recommended.includes(m.id)).map((m) => m.id);
  return { order: [...recommended, ...rest], recommended };
}

/**
 * Sorteia template + paleta compatíveis (padrão ou alternativas do template, nos dois modos).
 * Nunca devolve tema reprovado em contraste: só aceita combinações sem nenhum ajuste.
 * `random` entre 0 e 1 (injetável para teste).
 */
export function surpriseTheme(
  metas: TemplateMeta[],
  opts: {
    segment?: string | null;
    base?: Theme | null;
    accent?: string | null;
    random?: () => number;
  } = {},
): Theme {
  const random = opts.random ?? Math.random;
  const pool = opts.segment ? metas.filter((m) => m.segments.includes(opts.segment as never)) : [];
  const candidates = (pool.length ? pool : metas).flatMap((meta) =>
    [meta.paletteId, ...meta.altPaletteIds]
      .filter((id): id is string => Boolean(id))
      .flatMap((paletteId) =>
        (["light", "dark"] as const).map((mode) =>
          themeFromTemplate(meta, { paletteId, mode, base: opts.base, accent: opts.accent }),
        ),
      ),
  );
  const ok = candidates.filter((t) => resolveTheme(t).adjustments.length === 0);
  const list = ok.length ? ok : candidates;
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}
