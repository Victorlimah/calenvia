import Link from "next/link";
import { Logo } from "@/components/logo";
import { COMPANY } from "@/lib/company";

export type LegalSection = { title: string; paragraphs: string[]; items?: string[] };

/** Layout simples e legível para Termos e Privacidade. */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link
            href="/"
            aria-label="Calenvia, início"
            className="inline-flex min-h-11 items-center"
          >
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <h1 className="font-display text-4xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">Última atualização: {COMPANY.legalUpdatedAt}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink-2">{intro}</p>
        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.title} aria-labelledby={`sec-${i}`}>
              <h2 id={`sec-${i}`} className="font-display text-2xl font-bold text-ink">
                {i + 1}. {s.title}
              </h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-ink-2">
                  {p}
                </p>
              ))}
              {s.items ? (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-ink-2">
                  {s.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
        <p className="mt-14 text-sm text-muted">
          Dúvidas? Escreva para{" "}
          <a className="font-semibold text-brand underline" href={`mailto:${COMPANY.contactEmail}`}>
            {COMPANY.contactEmail}
          </a>
          .
        </p>
      </main>
    </div>
  );
}
