import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Badge, Card } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/dates";
import { hasFeature } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SupportForm } from "./support-form";

export const metadata: Metadata = { title: "Ajuda — Calenvia" };

const FAQ = [
  {
    q: "Como coloco o link na bio do Instagram?",
    a: "Em Ajustes › Link da página, toque em Copiar. No Instagram: Editar perfil › Links › Adicionar link externo.",
  },
  {
    q: "Um cliente pediu para remarcar. O que faço?",
    a: "Abra o agendamento na Agenda e toque em Remarcar. No Pro e no Pro+, o próprio cliente pode remarcar pelo link da mensagem.",
  },
  {
    q: "Vou tirar folga ou sair mais cedo. Como fecho a agenda?",
    a: "Na Agenda, toque em Bloquear e escolha o período. Ninguém consegue agendar nesse horário.",
  },
  {
    q: "A mensagem automática não chegou para o cliente.",
    a: "Veja o histórico de mensagens no detalhe do agendamento. Se a cota do mês acabou ou o número tem algum problema, use “Enviar confirmação no WhatsApp”.",
  },
  {
    q: "Um profissional trabalha em dias diferentes. Dá para configurar?",
    a: "Sim: Ajustes › Profissionais › Horário. Escolha “Horário próprio” e marque os dias dele.",
  },
];

const TOPICS: Record<string, string> = {
  agenda: "Agenda",
  whatsapp: "WhatsApp",
  pagina: "Página",
  assinatura: "Assinatura",
  outro: "Outro",
};

export default async function AjudaPage() {
  const business = await requireReadyBusiness();
  const priority = hasFeature(business, "prioritySupport");
  const supabase = await createSupabaseServerClient();
  const { data: requests } = await supabase
    .from("support_requests")
    .select("id, topic, message, status, priority, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <PageBody>
      <PageHeader title="Ajuda" back={{ href: "/ajustes", label: "Ajustes" }} />

      <section aria-labelledby="duvidas" className="space-y-2">
        <h2 id="duvidas" className="font-display text-lg font-bold">
          Dúvidas frequentes
        </h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="rounded-[var(--radius-card)] border border-line bg-white px-4"
            >
              <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
                {f.q}
              </summary>
              <p className="pb-4 text-ink-2">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="fale" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="fale" className="font-display text-lg font-bold">
            Fale com a gente
          </h2>
          {priority ? <Badge tone="brand">Suporte prioritário</Badge> : null}
        </div>
        <p className="text-sm text-ink-2">
          Respondemos em{" "}
          {priority ? COMPANY.supportResponse.priority : COMPANY.supportResponse.standard}. Também
          pelo e-mail{" "}
          <a href={`mailto:${COMPANY.contactEmail}`} className="font-semibold text-brand underline">
            {COMPANY.contactEmail}
          </a>
          .
        </p>
        <SupportForm />
      </section>

      {requests?.length ? (
        <section aria-labelledby="pedidos" className="space-y-2">
          <h2 id="pedidos" className="font-display text-lg font-bold">
            Seus pedidos
          </h2>
          <Card className="divide-y divide-line p-0">
            {requests.map((r) => (
              <div key={r.id} className="space-y-1 px-4 py-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">
                    {TOPICS[r.topic]} · {formatDate(new Date(r.created_at), business.timezone)}
                  </span>
                  <Badge tone={r.status === "open" ? "warning" : "success"}>
                    {r.status === "open" ? "Aguardando" : "Respondido"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-sm text-ink-2">{r.message}</p>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </PageBody>
  );
}
