import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-brand">{icon}</div> : null}
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Tente de novo em alguns segundos.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-[var(--radius-card)] border border-danger/30 bg-danger-50 px-6 py-10 text-center"
    >
      <p className="font-display text-lg font-bold text-danger">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
