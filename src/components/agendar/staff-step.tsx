"use client";

import { Avatar } from "@/components/avatar";
import { readableTextOn } from "@/lib/color";
import type { PublicStaff } from "./types";

export function StaffStep({
  staff,
  selectedId,
  accent,
  onSelect,
}: {
  /** Só os profissionais aptos ao serviço escolhido. */
  staff: PublicStaff[];
  selectedId: string | null;
  accent: string;
  onSelect: (id: string | null) => void;
}) {
  const options: { id: string | null; name: string; detail: string; photo?: string | null }[] = [
    ...(staff.length > 1
      ? [{ id: null, name: "Sem preferência", detail: "Primeiro profissional livre no horário" }]
      : []),
    ...staff.map((s) => ({ id: s.id, name: s.name, detail: s.role ?? "", photo: s.photo_url })),
  ];
  return (
    <ul className="space-y-3" role="radiogroup" aria-label="Profissionais">
      {options.map((o) => {
        const selected = o.id === selectedId || (staff.length === 1 && o.id === staff[0].id);
        return (
          <li key={o.id ?? "qualquer"} role="none">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(o.id)}
              className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border-2 bg-white/5 p-4 text-left"
              style={{ borderColor: selected ? accent : "rgba(255,255,255,.1)" }}
            >
              {o.id === null ? (
                <span
                  aria-hidden="true"
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-xl"
                  style={{ background: accent, color: readableTextOn(accent) }}
                >
                  ★
                </span>
              ) : (
                <Avatar name={o.name} url={o.photo} size={48} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-bold">{o.name}</span>
                {o.detail ? <span className="block text-sm text-night-sub">{o.detail}</span> : null}
              </span>
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
