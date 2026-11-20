"use client";

import { cn } from "@/lib/cn";
import {
  setDensity,
  setFontPair,
  setLogoOptions,
  setPhotoStyle,
  setRadius,
} from "@/lib/themes/edit";
import { logoPlacements } from "@/lib/themes/logo";
import { FONT_PAIRS, fontPairVars } from "@/lib/themes/font-pairs";
import { ALL_FONT_CLASSNAMES } from "@/lib/themes/fonts";
import type { DensityId, LogoPlacement, LogoShape, RadiusId, Theme } from "@/lib/themes/schema";

const LOGO_SHAPES: [LogoShape, string][] = [
  ["square", "Quadrado"],
  ["round", "Redondo"],
  ["free", "Livre (sem recorte)"],
];
const LOGO_PLACES: [LogoPlacement, string][] = [
  ["header", "Cabeçalho"],
  ["hero", "Abertura"],
  ["footer", "Rodapé"],
];

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
        <legend className="mb-2 text-sm font-semibold text-ink">Logo</legend>
        <label className="flex min-h-11 items-center gap-3 text-ink">
          <input
            type="checkbox"
            className="size-5"
            checked={theme.logo.show}
            onChange={(e) => onChange(setLogoOptions(theme, { show: e.target.checked }))}
          />
          Mostrar meu logo (sem ele, usamos as iniciais do negócio)
        </label>
        <p className="mt-2 mb-1 text-sm text-ink-2">Formato</p>
        <div className="flex flex-wrap gap-2">
          {LOGO_SHAPES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme.logo.shape === id}
              onClick={() => onChange(setLogoOptions(theme, { shape: id }))}
              className={cn(
                "min-h-11 rounded-[var(--radius-control)] border bg-white px-3 font-semibold text-ink",
                theme.logo.shape === id ? "border-brand ring-2 ring-brand" : "border-line",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1 text-sm text-ink-2">Onde aparece</p>
        <div className="flex flex-wrap gap-x-5">
          {LOGO_PLACES.map(([id, label]) => {
            const current = logoPlacements(theme);
            const on = current.includes(id);
            return (
              <label key={id} className="flex min-h-11 items-center gap-2 text-ink">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={on}
                  onChange={() =>
                    onChange(
                      setLogoOptions(theme, {
                        placements: on ? current.filter((p) => p !== id) : [...current, id],
                      }),
                    )
                  }
                />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Fotos</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["none", "Cores naturais"],
              ["duotone", "Na cor do tema"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={(theme.photoStyle ?? "none") === id}
              onClick={() => onChange(setPhotoStyle(theme, id))}
              className={cn(
                "min-h-11 rounded-[var(--radius-control)] border bg-white px-4 font-semibold text-ink",
                (theme.photoStyle ?? "none") === id
                  ? "border-brand ring-2 ring-brand"
                  : "border-line",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-sm text-ink-2">
          “Na cor do tema” deixa fotos de celulares diferentes com a mesma cara.
        </p>
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
