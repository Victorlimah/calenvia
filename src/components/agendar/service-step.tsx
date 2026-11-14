"use client";

import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { readableTextOn } from "@/lib/color";
import type { PublicService } from "./types";

export function ServiceStep({
  services,
  selectedId,
  accent,
  onSelect,
}: {
  services: PublicService[];
  selectedId: string | null;
  accent: string;
  onSelect: (id: string) => void;
}) {
  if (services.length === 0) {
    return <p className="text-night-sub">Nenhum serviço disponível para agendar no momento.</p>;
  }
  return (
    <ul className="space-y-3" role="radiogroup" aria-label="Serviços">
      {services.map((s) => {
        const selected = s.id === selectedId;
        return (
          <li key={s.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(s.id)}
              className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border-2 bg-white/5 p-4 text-left transition-colors"
              style={{ borderColor: selected ? accent : "rgba(255,255,255,.1)" }}
            >
              <span
                aria-hidden="true"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
                style={
                  selected
                    ? { background: accent, borderColor: accent, color: readableTextOn(accent) }
                    : { borderColor: "rgba(255,255,255,.35)" }
                }
              >
                {selected ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">{s.name}</span>
                  {s.is_featured ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: accent, color: readableTextOn(accent) }}
                    >
                      Mais pedido
                    </span>
                  ) : null}
                </span>
                {s.description ? (
                  <span className="mt-0.5 block text-sm text-night-sub">{s.description}</span>
                ) : null}
                <span className="mt-1 block text-sm text-night-sub">
                  {formatDuration(s.duration_min)}
                </span>
              </span>
              <span className="font-display font-bold">{formatPrice(s.price_cents)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
