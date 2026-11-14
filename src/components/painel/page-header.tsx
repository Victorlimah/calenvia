import Link from "next/link";

export function PageHeader({
  title,
  description,
  back,
  action,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <header className="space-y-2">
      {back ? (
        <Link
          href={back.href}
          className="text-brand -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-ink text-3xl font-extrabold">{title}</h1>
          {description ? <p className="text-ink-2 mt-1">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-10 md:pt-10">{children}</main>
  );
}
