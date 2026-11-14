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
        "border-line flex flex-col items-center rounded-[var(--radius-card)] border border-dashed bg-white px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="text-brand mb-3">{icon}</div> : null}
      <p className="font-display text-ink text-lg font-bold">{title}</p>
      {description ? <p className="text-muted mt-1 max-w-sm text-sm">{description}</p> : null}
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
      className="border-danger/30 bg-danger-50 flex flex-col items-center rounded-[var(--radius-card)] border px-6 py-10 text-center"
    >
      <p className="font-display text-danger text-lg font-bold">{title}</p>
      <p className="text-ink-2 mt-1 max-w-sm text-sm">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
