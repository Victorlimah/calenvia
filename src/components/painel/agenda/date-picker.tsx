"use client";

import { useRouter } from "next/navigation";

/** Seletor de data que navega ao escolher (mantém os outros filtros). */
export function DatePicker({ value, extraQuery }: { value: string; extraQuery: string }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-3 text-sm font-semibold">
      <span aria-hidden="true">📅</span>
      <span className="sr-only">Escolher data</span>
      <input
        type="date"
        value={value}
        aria-label="Escolher data"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => {
          if (e.target.value) router.push(`/?data=${e.target.value}${extraQuery}`);
        }}
      />
    </label>
  );
}
