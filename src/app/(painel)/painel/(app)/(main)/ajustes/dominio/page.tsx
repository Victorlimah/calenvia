import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Card } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { dnsInstructions } from "@/lib/domains/normalize";
import { businessDisplayHost } from "@/lib/hosts";
import { hasFeature } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DomainForm } from "./domain-form";

export const metadata: Metadata = { title: "Domínio próprio — Calenvia" };

export default async function DominioPage() {
  const business = await requireReadyBusiness();
  const allowed = hasFeature(business, "customDomain");
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase
    .from("custom_domains")
    .select("domain, verified_at, last_error, last_checked_at")
    .eq("business_id", business.id)
    .maybeSingle();

  return (
    <PageBody>
      <PageHeader
        title="Domínio próprio"
        description={`Use um endereço seu (ex.: agenda.seunegocio.com.br) além de ${businessDisplayHost(business.slug)}.`}
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      {!allowed ? (
        <Card className="space-y-2">
          <p className="font-semibold">Domínio próprio faz parte do plano Pro+.</p>
          <p className="text-sm text-ink-2">
            Sua página continua funcionando normalmente em {businessDisplayHost(business.slug)}.
          </p>
          <Link href="/assinatura" className="font-semibold text-brand underline">
            Ver o plano Pro+
          </Link>
        </Card>
      ) : (
        <>
          <DomainForm
            current={row?.domain ?? null}
            verified={Boolean(row?.verified_at)}
            lastError={row?.last_error ?? null}
          />
          {row && !row.verified_at ? (
            <Card className="space-y-3">
              <h2 className="font-display text-lg font-bold">Como configurar</h2>
              <p className="text-sm text-ink-2">
                No site onde você registrou o domínio (Registro.br, GoDaddy, Hostinger…), abra a
                área de DNS e crie este registro:
              </p>
              <dl className="grid grid-cols-3 gap-2 rounded-xl bg-paper-2 p-3 font-mono text-sm">
                <dt className="text-ink-2">Tipo</dt>
                <dt className="text-ink-2">Nome</dt>
                <dt className="text-ink-2">Valor</dt>
                <dd>{dnsInstructions(row.domain).type}</dd>
                <dd>{dnsInstructions(row.domain).name}</dd>
                <dd className="break-all">{dnsInstructions(row.domain).value}</dd>
              </dl>
              <p className="text-sm text-ink-2">
                Depois toque em “Verificar agora”. A mudança no DNS pode levar algumas horas.
              </p>
            </Card>
          ) : null}
        </>
      )}
    </PageBody>
  );
}
