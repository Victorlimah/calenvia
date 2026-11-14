import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SignOutButton } from "@/components/painel/shell";
import { requireReadyBusiness } from "@/lib/business/current";
import { businessDisplayHost } from "@/lib/hosts";

export const metadata: Metadata = { title: "Ajustes — Calenvia" };

const ITEMS = [
  {
    href: "/ajustes/link",
    title: "Link da página",
    desc: "Copiar, ver a página e dica para o Instagram",
  },
  {
    href: "/ajustes/negocio",
    title: "Dados do negócio",
    desc: "Nome, endereço, WhatsApp e endereço da página",
  },
  { href: "/ajustes/servicos", title: "Serviços", desc: "Duração, preço e “mais pedido”" },
  { href: "/ajustes/profissionais", title: "Profissionais", desc: "Equipe e serviços de cada um" },
  {
    href: "/ajustes/horarios",
    title: "Horário de funcionamento",
    desc: "Dias, horários e intervalos",
  },
  {
    href: "/ajustes/regras",
    title: "Regras da agenda",
    desc: "Antecedência, dias à frente e intervalo",
  },
  { href: "/ajustes/aparencia", title: "Aparência da página", desc: "Logo, capa, cor e textos" },
  { href: "/assinatura", title: "Assinatura", desc: "Plano, faturas e mensagens do mês" },
];

export default async function AjustesPage() {
  const business = await requireReadyBusiness();
  return (
    <PageBody>
      <PageHeader title="Ajustes" description={businessDisplayHost(business.slug)} />
      <ul className="divide-line border-line divide-y overflow-hidden rounded-[var(--radius-card)] border bg-white">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="hover:bg-paper-2 flex min-h-16 items-center gap-3 px-5 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="text-ink block font-semibold">{item.title}</span>
                <span className="text-muted block truncate text-sm">{item.desc}</span>
              </span>
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-line rounded-[var(--radius-card)] border bg-white p-2 md:hidden">
        <SignOutButton />
      </div>
    </PageBody>
  );
}
