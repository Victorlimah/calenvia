import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { formatDate } from "@/lib/dates";
import { siteUrl } from "@/lib/hosts";
import { waMeLink } from "@/lib/phone";
import { newRefCode, referralShareText } from "@/lib/referrals";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CopyLink } from "./copy-link";

export const metadata: Metadata = { title: "Indique a Calenvia — Calenvia" };

export default async function IndicarPage() {
  const business = await requireReadyBusiness();
  let code = business.referral_code;
  if (!code) {
    // Negócios antigos ganham o código na primeira visita.
    for (let i = 0; i < 3 && !code; i++) {
      const candidate = newRefCode();
      const { error } = await createSupabaseAdminClient()
        .from("businesses")
        .update({ referral_code: candidate })
        .eq("id", business.id);
      if (!error) code = candidate;
    }
  }
  const link = siteUrl(`/?ref=${code}`);
  const { data: referrals } = await (await createSupabaseServerClient()).rpc("my_referrals");
  const list = referrals ?? [];

  return (
    <PageBody>
      <PageHeader
        title="Indique a Calenvia"
        description="Conhece alguém que vive respondendo “tem horário hoje?” no WhatsApp? Mande seu link."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <Card className="space-y-3">
        <p className="text-sm font-semibold">Seu link de indicação</p>
        <p className="rounded-xl bg-paper-2 p-3 font-mono text-sm break-all" data-testid="ref-link">
          {link}
        </p>
        <CopyLink link={link} />
        <a
          href={waMeLink("", referralShareText(business.name, link))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
        >
          Enviar pelo WhatsApp
        </a>
      </Card>

      <section aria-labelledby="indicados" className="space-y-2">
        <h2 id="indicados" className="font-display text-lg font-bold">
          Quem entrou pelo seu link ({list.length})
        </h2>
        {list.length ? (
          <Card className="divide-y divide-line p-0">
            {list.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="font-semibold">{r.name}</span>
                <span className="flex items-center gap-2 text-sm text-ink-2">
                  {formatDate(new Date(r.created_at), business.timezone)}
                  <Badge tone={r.active ? "success" : "neutral"}>
                    {r.active ? "Usando" : "Começando"}
                  </Badge>
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            title="Ninguém ainda"
            description="Quando alguém criar a conta pelo seu link, aparece aqui."
          />
        )}
      </section>
    </PageBody>
  );
}
