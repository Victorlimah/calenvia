import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SignOutButton } from "@/components/painel/shell";
import { NotificationSettings } from "@/components/painel/notification-settings";
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
  {
    href: "/relatorios",
    title: "Relatórios",
    desc: "Faturamento, faltas e melhores clientes (Pro+)",
  },
  {
    href: "/ajustes/dominio",
    title: "Domínio próprio",
    desc: "Sua página no seu endereço (Pro+)",
  },
  { href: "/assinatura", title: "Assinatura", desc: "Plano, faturas e mensagens do mês" },
  { href: "/ajuda", title: "Ajuda", desc: "Dúvidas frequentes e fale com a gente" },
];

export default async function AjustesPage() {
  const business = await requireReadyBusiness();
  return (
    <PageBody>
      <PageHeader title="Ajustes" description={businessDisplayHost(business.slug)} />
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-paper-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{item.title}</span>
                <span className="block truncate text-sm text-muted">{item.desc}</span>
              </span>
              <span aria-hidden="true" className="text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <NotificationSettings />
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-2 md:hidden">
        <SignOutButton />
      </div>
    </PageBody>
  );
}
