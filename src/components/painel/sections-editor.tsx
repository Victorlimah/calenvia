"use client";

import { editableSections, moveSection, SECTION_LABELS, toggleSection } from "@/lib/themes/edit";
import type { Theme } from "@/lib/themes/schema";

/** Ligar/desligar e reordenar as seções da página (CAL-144). Abertura e chamada final fixas. */
export function SectionsEditor({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (t: Theme) => void;
}) {
  const list = editableSections(theme);
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-2">
        A abertura (com o botão de agendar) e a chamada final ficam sempre. Seções sem conteúdo,
        como fotos ou depoimentos, só aparecem quando você cadastrar.
      </p>
      <ol className="divide-y divide-line rounded-[var(--radius-control)] border border-line bg-white">
        {list.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 px-3 py-1.5">
            <label className="flex min-h-11 flex-1 items-center gap-3 text-ink">
              <input
                type="checkbox"
                className="size-5"
                checked={s.visible}
                onChange={() => onChange(toggleSection(theme, s.id))}
              />
              <span className={s.visible ? "font-semibold" : "text-muted line-through"}>
                {SECTION_LABELS[s.id]}
              </span>
            </label>
            <button
              type="button"
              aria-label={`Subir ${SECTION_LABELS[s.id]}`}
              disabled={i === 0}
              onClick={() => onChange(moveSection(theme, s.id, -1))}
              className="inline-flex size-11 items-center justify-center rounded-xl text-lg text-ink-2 hover:bg-paper-2 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Descer ${SECTION_LABELS[s.id]}`}
              disabled={i === list.length - 1}
              onClick={() => onChange(moveSection(theme, s.id, 1))}
              className="inline-flex size-11 items-center justify-center rounded-xl text-lg text-ink-2 hover:bg-paper-2 disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
