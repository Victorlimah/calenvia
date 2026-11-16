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
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
          {description ? <p className="mt-1 text-ink-2">{description}</p> : null}
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

/** Título de uma aba dentro de uma área com abas (o h1 fica no layout da área). */
export function SectionHeader({
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
    <header className="space-y-1">
      {back ? (
        <Link
          href={back.href}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand"
        >
          <span aria-hidden="true">←</span> {back.label}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-ink-2">{description}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Conteúdo de uma aba: coluna de leitura confortável (formulários). */
export function TabBody({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? "space-y-6" : "max-w-2xl space-y-6"}>{children}</div>;
}
