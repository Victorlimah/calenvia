"use client";

import { cn } from "@/lib/cn";
import { setDensity, setFontPair, setRadius } from "@/lib/themes/edit";
import { FONT_PAIRS, fontPairVars } from "@/lib/themes/font-pairs";
import { ALL_FONT_CLASSNAMES } from "@/lib/themes/fonts";
import type { DensityId, RadiusId, Theme } from "@/lib/themes/schema";

const RADIUS_OPTIONS: [RadiusId, string, string][] = [
  ["square", "Retos", "rounded-[4px]"],
  ["soft", "Suaves", "rounded-[14px]"],
  ["round", "Bem arredondados", "rounded-full"],
];
const DENSITY_OPTIONS: [DensityId, string][] = [
  ["comfortable", "Confortável"],
  ["compact", "Compacta"],
];

/** Fontes, cantos e densidade (CAL-142). Controlado pelo pai, como o editor de cores. */
export function StyleEditor({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className={cn("space-y-5", ALL_FONT_CLASSNAMES)}>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Fontes</legend>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Pares de fontes">
          {FONT_PAIRS.map((f) => {
            const vars = fontPairVars(f.id);
            const active = theme.fontPairId === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(setFontPair(theme, f.id))}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-[var(--radius-control)] border bg-white px-3 py-2 text-left",
                    active ? "border-brand ring-2 ring-brand" : "border-line hover:border-ink-2",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="w-12 shrink-0 text-center text-3xl leading-none font-bold text-ink"
                    style={{ fontFamily: vars["--t-font-display"] }}
                  >
                    Aa
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block font-semibold text-ink"
                      style={{ fontFamily: vars["--t-font-body"] }}
                    >
                      {f.name}
                    </span>
                    <span className="block text-xs text-ink-2">{f.description}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Cantos</legend>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map(([id, label, shape]) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme.radius === id}
              onClick={() => onChange(setRadius(theme, id))}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border bg-white px-3 font-semibold text-ink",
                theme.radius === id ? "border-brand ring-2 ring-brand" : "border-line",
              )}
            >
              <span aria-hidden="true" className={cn("size-5 border-2 border-ink-2", shape)} />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Espaçamento</legend>
        <div className="flex flex-wrap gap-2">
          {DENSITY_OPTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme.density === id}
              onClick={() => onChange(setDensity(theme, id))}
              className={cn(
                "min-h-11 rounded-[var(--radius-control)] border bg-white px-4 font-semibold text-ink",
                theme.density === id ? "border-brand ring-2 ring-brand" : "border-line",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
