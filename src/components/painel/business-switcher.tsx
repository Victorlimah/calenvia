"use client";

import { useTransition } from "react";
import { switchBusinessAction } from "@/app/(painel)/painel/(app)/_actions/team";

/** Seletor de negócio (CAL-112). Só aparece para quem é membro de mais de um negócio. */
export function BusinessSwitcher({
  current,
  options,
}: {
  current: string;
  options: { id: string; name: string; role: string }[];
}) {
  const [pending, start] = useTransition();
  if (options.length < 2) return null;
  return (
    <label className="block space-y-1">
      <span className="px-1 text-sm font-semibold text-ink-2">Negócio</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            const r = await switchBusinessAction(id);
            if (r.ok) window.location.assign("/");
          });
        }}
        className="min-h-12 w-full rounded-[var(--radius-control)] border border-line bg-white px-3 text-base"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {o.role}
          </option>
        ))}
      </select>
    </label>
  );
}
