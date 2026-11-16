import Link from "next/link";

export function AdminBody({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 pb-10 md:px-8 md:pt-10">
      {children}
    </main>
  );
}

export function AdminTitle({
  title,
  description,
  back,
}: {
  title: string;
  description?: string;
  back?: { href: string; label: string };
}) {
  return (
    <header className="space-y-2">
      {back ? (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
      {description ? <p className="text-ink-2">{description}</p> : null}
    </header>
  );
}
