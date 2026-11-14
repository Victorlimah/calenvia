import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { QuotaAlert, QuotaMeter } from "@/components/painel/quota";
import { Badge, Card } from "@/components/ui";
import { requirePermission } from "@/lib/business/current";
import { canSendAutomaticMessages, formatPlanPrice, PLAN_ORDER, PLANS, planOf } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthQuota, quotaResetLabel } from "@/lib/whatsapp/quota";

export const metadata: Metadata = { title: "Assinatura — Calenvia" };

const STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  pending: { label: "Aguardando pagamento", tone: "warning" },
  active: { label: "Ativa", tone: "success" },
  past_due: { label: "Pagamento atrasado", tone: "warning" },
  suspended: { label: "Suspensa", tone: "danger" },
  canceled: { label: "Cancelada", tone: "danger" },
};

export default async function AssinaturaPage() {
  const { business } = await requirePermission("billing.manage");
  const plan = planOf(business);
  const automatic = canSendAutomaticMessages(business);
  const quota = automatic
    ? await getMonthQuota(await createSupabaseServerClient(), business)
    : null;
  const status = STATUS[business.plan_status] ?? STATUS.pending;

  return (
    <PageBody>
      <PageHeader title="Assinatura" back={{ href: "/ajustes", label: "Ajustes" }} />

      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold text-ink">Plano {plan.name}</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-ink-2">{formatPlanPrice(plan)} por mês</p>
      </Card>

      <section aria-labelledby="mensagens-titulo" className="space-y-3">
        <h2 id="mensagens-titulo" className="font-display text-lg font-bold">
          Mensagens automáticas do mês
        </h2>
        {quota ? (
          <>
            <QuotaAlert notice={quota.notice} showLink={false} />
            <Card>
              <QuotaMeter state={quota.state} resetLabel={quotaResetLabel(quota.period)} />
            </Card>
          </>
        ) : (
          <Card>
            <p className="text-ink-2">
              No plano {plan.name}, a confirmação vai pelo seu WhatsApp, com a mensagem pronta: é só
              tocar em “Enviar confirmação no WhatsApp” no agendamento. Nos planos Pro e Pro+, a
              confirmação e o lembrete saem sozinhos.
            </p>
          </Card>
        )}
      </section>

      <section aria-labelledby="planos-titulo" className="space-y-3">
        <h2 id="planos-titulo" className="font-display text-lg font-bold">
          Planos
        </h2>
        <ul className="space-y-3">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const current = p.id === plan.id;
            return (
              <li key={id}>
                <Card className={current ? "border-brand ring-1 ring-brand" : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl font-bold text-ink">{p.name}</h3>
                    <p className="font-semibold text-ink">{formatPlanPrice(p)}/mês</p>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-ink-2">
                    {p.highlights.map((h) => (
                      <li key={h}>✓ {h}</li>
                    ))}
                  </ul>
                  {current ? (
                    <p className="mt-3 text-sm font-semibold text-brand">Seu plano atual</p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-ink-2">
          A troca de plano pelo painel chega junto com o pagamento online.
        </p>
      </section>
    </PageBody>
  );
}
