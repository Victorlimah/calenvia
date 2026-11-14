import Link from "next/link";
import { cn } from "@/lib/cn";

export function StaffChips({
  staff,
  selected,
  hrefFor,
}: {
  staff: { id: string; name: string }[];
  selected: string | null;
  hrefFor: (id: string | null) => string;
}) {
  if (staff.length < 2) return null;
  const chips = [{ id: null as string | null, name: "Todos" }, ...staff];
  return (
    <nav aria-label="Filtrar por profissional" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        {chips.map((c) => {
          const active = c.id === selected;
          return (
            <li key={c.id ?? "todos"}>
              <Link
                href={hrefFor(c.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap",
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink-2 hover:border-ink",
                )}
              >
                {c.id ? c.name.split(" ")[0] : c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
