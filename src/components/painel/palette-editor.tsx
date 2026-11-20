"use client";

import { useId, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  choosePreset,
  isModifiedFromPreset,
  revertToPreset,
  setMode,
  setPrimary,
  setSecondary,
} from "@/lib/themes/edit";
import { PALETTES } from "@/lib/themes/palettes";
import { closestPalette, dominantColor, logoPrimary } from "@/lib/themes/logo";
import { resolveTheme } from "@/lib/themes/resolve";
import type { Theme } from "@/lib/themes/schema";

/**
 * Editor de cores (CAL-141): paleta pronta em bolinhas, claro/escuro, cor principal própria
 * (seletor + hexadecimal), secundária opcional e "Voltar à paleta original". Controlado: o pai
 * guarda o tema e mostra a prévia. Combinações ilegíveis são corrigidas pelo resolveTheme.
 */
export function PaletteEditor({
  theme,
  onChange,
  logoUrl,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  /** Com logo, oferece "Usar as cores do logo" (CAL-143). */
  logoUrl?: string | null;
}) {
  const [logoNote, setLogoNote] = useState<string | null>(null);

  async function fromLogo() {
    if (!logoUrl) return;
    setLogoNote(null);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("img"));
        img.src = logoUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0, 64, 64);
      const color = dominantColor(ctx.getImageData(0, 0, 64, 64).data);
      if (!color) {
        apply(choosePreset(theme, closestPalette("#777777")));
        setLogoNote("Seu logo é preto e branco: sugerimos a paleta Monocromático.");
        return;
      }
      const preset = closestPalette(color);
      const next = setPrimary(choosePreset(theme, preset), logoPrimary(color)) ?? theme;
      apply(next);
      setLogoNote(`Usamos a cor do seu logo com a paleta ${preset.name}.`);
    } catch {
      setLogoNote("Não conseguimos ler as cores do logo. Escolha uma paleta abaixo.");
    }
  }
  const uid = useId();
  const [primaryText, setPrimaryText] = useState(theme.palette.primary);
  const [secondaryText, setSecondaryText] = useState(theme.palette.secondary ?? "");
  const [primaryError, setPrimaryError] = useState<string | null>(null);
  const [secondaryError, setSecondaryError] = useState<string | null>(null);
  const resolved = resolveTheme(theme);
  const mode = theme.palette.mode;

  function apply(next: Theme) {
    onChange(next);
    setPrimaryText(next.palette.primary);
    setSecondaryText(next.palette.secondary ?? "");
    setPrimaryError(null);
    setSecondaryError(null);
  }

  function typePrimary(value: string) {
    setPrimaryText(value);
    const next = setPrimary(theme, value);
    if (next) {
      setPrimaryError(null);
      onChange(next);
    } else {
      setPrimaryError("Cor inválida. Use o formato #RRGGBB, por exemplo #D6456A.");
    }
  }

  function typeSecondary(value: string) {
    setSecondaryText(value);
    const next = setSecondary(theme, value);
    if (next) {
      setSecondaryError(null);
      onChange(next);
    } else {
      setSecondaryError("Cor inválida. Use o formato #RRGGBB ou deixe vazio.");
    }
  }

  return (
    <div className="@container space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Fundo da página</legend>
        <div className="inline-flex rounded-[var(--radius-control)] border border-line bg-paper-2 p-1">
          {(
            [
              ["light", "Claro"],
              ["dark", "Escuro"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => apply(setMode(theme, m))}
              className={cn(
                "min-h-11 rounded-[calc(var(--radius-control)-4px)] px-5 font-semibold",
                mode === m ? "bg-white text-ink shadow-sm" : "text-ink-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {logoUrl ? (
        <div className="space-y-2">
          <Button type="button" variant="secondary" size="sm" onClick={fromLogo}>
            Usar as cores do logo
          </Button>
          {logoNote ? (
            <p className="text-sm text-ink-2" role="status">
              {logoNote}
            </p>
          ) : null}
        </div>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Paletas prontas</legend>
        <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-3" aria-label="Paletas prontas">
          {PALETTES.map((p) => {
            const c = p[mode];
            const active = theme.paletteId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => apply(choosePreset(theme, p))}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-2 rounded-[var(--radius-control)] border bg-white px-3 py-2 text-left",
                    active ? "border-brand ring-2 ring-brand" : "border-line hover:border-ink-2",
                  )}
                >
                  <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                    {[c.background, c.primary, c.secondary ?? c.surface, c.text].map((col, i) => (
                      <span
                        key={i}
                        className="size-5 rounded-full border border-black/15"
                        style={{ background: col }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 text-sm leading-tight font-semibold text-ink">
                    {p.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="grid gap-4 @md:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-primary`} className="mb-1 block text-sm font-semibold text-ink">
            Cor principal
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Escolher a cor principal"
              value={theme.palette.primary.toLowerCase()}
              onChange={(e) => typePrimary(e.target.value.toUpperCase())}
              className="size-11 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-line bg-white p-1"
            />
            <input
              id={`${uid}-primary`}
              value={primaryText}
              onChange={(e) => typePrimary(e.target.value)}
              aria-invalid={Boolean(primaryError)}
              aria-describedby={primaryError ? `${uid}-primary-error` : undefined}
              spellCheck={false}
              className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 font-mono text-ink uppercase"
            />
          </div>
          {primaryError ? (
            <p id={`${uid}-primary-error`} className="mt-1 text-sm text-danger">
              {primaryError}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={`${uid}-secondary`} className="mb-1 block text-sm font-semibold text-ink">
            Cor secundária (opcional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Escolher a cor secundária"
              value={(theme.palette.secondary ?? "#DDDDDD").toLowerCase()}
              onChange={(e) => typeSecondary(e.target.value.toUpperCase())}
              className="size-11 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-line bg-white p-1"
            />
            <input
              id={`${uid}-secondary`}
              value={secondaryText}
              placeholder="Sem cor secundária"
              onChange={(e) => typeSecondary(e.target.value)}
              aria-invalid={Boolean(secondaryError)}
              aria-describedby={secondaryError ? `${uid}-secondary-error` : undefined}
              spellCheck={false}
              className="min-h-11 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 font-mono text-ink uppercase"
            />
          </div>
          {secondaryError ? (
            <p id={`${uid}-secondary-error`} className="mt-1 text-sm text-danger">
              {secondaryError}
            </p>
          ) : null}
        </div>
      </div>

      {isModifiedFromPreset(theme) ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => apply(revertToPreset(theme))}
        >
          Voltar à paleta original
        </Button>
      ) : null}

      <div aria-live="polite">
        {resolved.adjustments.length ? (
          <Alert tone="info" title="Ajustamos para ficar legível">
            {resolved.adjustments.join(" ")}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
