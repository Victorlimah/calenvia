import type { Metadata } from "next";
import Link from "next/link";
import { BusinessInfoForm } from "@/components/painel/business-info-form";
import { SectionHeader, TabBody } from "@/components/painel/page-header";
import { QrCodeCard } from "@/components/painel/qr-code-card";
import { qrColor } from "@/lib/themes/qr";
import { resolveTheme } from "@/lib/themes/resolve";
import { ShareLinkCard } from "@/components/painel/share-link-card";
import { requirePermission } from "@/lib/business/current";
import { businessDisplayHost, businessUrl } from "@/lib/hosts";

export const metadata: Metadata = { title: "Dados e página — Calenvia" };

const PAGE_LINKS = [
  {
    href: "/negocio/aparencia",
    title: "Aparência da página",
    desc: "Logo, capa, cor, textos, fotos e depoimentos",
  },
  {
    href: "/negocio/avaliacoes",
    title: "Avaliações",
    desc: "Notas dos clientes e depoimentos da página",
  },
];

export default async function NegocioDadosPage() {
  const { business } = await requirePermission("settings.manage");
  const url = businessUrl(business.slug);
  const shareText = `Agora você pode agendar seu horário na ${business.name} pelo link: ${url}`;
  return (
    <TabBody wide>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="space-y-4">
          <SectionHeader title="Sua página" description="Divulgue onde seus clientes estão." />
          <ShareLinkCard url={url} displayHost={businessDisplayHost(business.slug)} />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-line bg-white px-4 font-semibold text-ink hover:border-brand"
          >
            Enviar o link pelo WhatsApp
          </a>
          <QrCodeCard
            url={url}
            name={business.slug}
            color={qrColor(resolveTheme(business.theme, business.accent_color))}
          />
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
            {PAGE_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-paper-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{item.title}</span>
                    <span className="block text-sm text-muted">{item.desc}</span>
                  </span>
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-4">
          <SectionHeader
            title="Dados do negócio"
            description="Nome, endereço, WhatsApp e endereço da página."
          />
          <BusinessInfoForm
            submitLabel="Salvar"
            defaults={{
              name: business.name,
              segment: (business.segment ?? undefined) as never,
              address: business.address ?? "",
              address_reference: business.address_reference ?? "",
              whatsapp: business.whatsapp,
              instagram: business.instagram ?? "",
              slug: business.slug,
              timezone: business.timezone,
            }}
          />
        </section>
      </div>
    </TabBody>
  );
}
