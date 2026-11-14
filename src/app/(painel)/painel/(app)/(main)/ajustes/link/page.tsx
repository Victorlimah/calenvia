import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { ShareLinkCard } from "@/components/painel/share-link-card";
import { requireReadyBusiness } from "@/lib/business/current";
import { businessDisplayHost, businessUrl } from "@/lib/hosts";
import { waMeLink } from "@/lib/phone";

export const metadata: Metadata = { title: "Link da página — Calenvia" };

export default async function AjustesLinkPage() {
  const b = await requireReadyBusiness();
  const url = businessUrl(b.slug);
  const shareText = `Agora você pode agendar seu horário na ${b.name} pelo link: ${url}`;
  return (
    <PageBody>
      <PageHeader
        title="Link da página"
        description="Divulgue onde seus clientes estão."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <ShareLinkCard url={url} displayHost={businessDisplayHost(b.slug)} />
      <a
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noopener"
        className="flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-line bg-white px-4 font-semibold text-ink hover:border-brand"
      >
        Enviar o link pelo WhatsApp
      </a>
      {b.whatsapp ? (
        <p className="text-center text-sm text-muted">
          Seu WhatsApp na página:{" "}
          <a
            className="font-semibold text-brand"
            href={waMeLink(b.whatsapp)}
            target="_blank"
            rel="noopener"
          >
            abrir conversa
          </a>
        </p>
      ) : null}
    </PageBody>
  );
}
