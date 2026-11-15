import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { QuotaAlert, QuotaMeter } from "@/components/painel/quota";
import { Alert, Badge, Card } from "@/components/ui";
import { isMockBilling } from "@/lib/billing/config";
import { loadSubscriptionItems } from "@/lib/billing/items";
import { PLAN_CHANGE_MESSAGES, planChangeKind, type PlanChangeCode } from "@/lib/billing/lifecycle";
import { getCurrentPrices } from "@/lib/billing/prices-server";
import { graceEndsAt } from "@/lib/billing/status";
import { requirePermission } from "@/lib/business/current";
import { formatPrice } from "@/lib/money";
import { can } from "@/lib/permissions";
import { canSendAutomaticMessages, PLAN_ORDER, PLANS, planOf, type PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthQuota, quotaResetLabel } from "@/lib/whatsapp/quota";
import { CancelControls, CardButton, PlanButton } from "./subscription-actions";

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

const INVOICE_STATUS: Record<
  string,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" }
> = {
  paid: { label: "Paga", tone: "success" },
  open: { label: "Em aberto", tone: "warning" },
  failed: { label: "Não paga", tone: "danger" },
  void: { label: "Anulada", tone: "neutral" },
};

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ativado?: string; troca?: string }>;
}) {
  const { ativado, troca } = await searchParams;
  const changeMessage =
    troca && troca in PLAN_CHANGE_MESSAGES ? PLAN_CHANGE_MESSAGES[troca as PlanChangeCode] : null;
  const member = await requirePermission("billing.view");
  const { business } = member;
  const manage = can(member, "billing.manage");
  const plan = planOf(business);
  const tz = business.timezone;
  const day = (iso: string) => formatInTimeZone(new Date(iso), tz, "dd/MM/yyyy");

  const db = createSupabaseAdminClient();
  const automatic = canSendAutomaticMessages(business);
  const [quota, { data: sub }, { items, totalCents }, { data: invoices }, prices] =
    await Promise.all([
      automatic ? getMonthQuota(await createSupabaseServerClient(), business) : null,
      db
        .from("subscriptions")
        .select(
          "provider, status, current_period_end, cancel_at_period_end, pending_plan, past_due_since",
        )
        .eq("business_id", business.id)
        .neq("status", "canceled")
        .maybeSingle(),
      loadSubscriptionItems(db, business.id),
      db
        .from("invoices")
        .select("id, amount_cents, status, created_at, paid_at, hosted_url, lines")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(12),
      getCurrentPrices(),
    ]);
  const status = STATUS[business.plan_status] ?? STATUS.pending;
  const courtesy = sub?.provider === "manual";
  const pendingPlan = (sub?.pending_plan as PlanId | null) ?? null;
  const periodEnd = sub?.current_period_end ?? null;
  const canChange = manage && !!sub && ["active", "past_due"].includes(sub.status);

  return (
    <PageBody>
      <PageHeader title="Assinatura" back={{ href: "/ajustes", label: "Ajustes" }} />
      {ativado ? (
        <Alert tone="success" title="Assinatura ativada!">
          Pagamento aprovado. Sua página já está recebendo agendamentos.
        </Alert>
      ) : null}

      {changeMessage ? <Alert tone="success">{changeMessage}</Alert> : null}

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold text-ink">Plano {plan.name}</h2>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <ul className="divide-y divide-line text-ink" aria-label="Itens da assinatura">
          {items.map((i) => (
            <li key={i.id ?? "plano"} className="flex justify-between gap-3 py-2">
              <span>
                {i.description}
                {i.quantity > 1 ? ` × ${i.quantity}` : ""}
              </span>
              <span>{formatPrice(i.amount_cents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-ink pt-3 font-display text-xl font-bold text-ink">
          <span>Total por mês</span>
          <span data-testid="assinatura-total">{formatPrice(totalCents)}</span>
        </p>
        {courtesy ? (
          <p className="text-sm text-ink-2">Assinatura liberada pela Calenvia, sem cobrança.</p>
        ) : periodEnd ? (
          <p className="text-sm text-ink-2">
            {sub?.cancel_at_period_end
              ? `Cancelamento agendado: sua assinatura termina em ${day(periodEnd)}.`
              : `Próxima cobrança em ${day(periodEnd)}.`}
          </p>
        ) : null}
        {pendingPlan && periodEnd ? (
          <Alert tone="info">
            Troca agendada: a partir de {day(periodEnd)} seu plano passa a ser{" "}
            <strong>{PLANS[pendingPlan].name}</strong>.
          </Alert>
        ) : null}
      </Card>

      {business.plan_status === "past_due" ? (
        <Alert tone="warning" title="Não conseguimos cobrar sua assinatura">
          Atualize o cartão para não perder o acesso.
          {sub?.past_due_since
            ? ` Tudo continua funcionando até ${day(graceEndsAt(sub.past_due_since).toISOString())}.`
            : ""}
        </Alert>
      ) : null}
      {business.plan_status === "suspended" ? (
        <Alert tone="danger" title="Assinatura suspensa">
          Sua página não está recebendo agendamentos. Atualize o cartão para pagar a fatura em
          aberto e tudo volta na hora.
        </Alert>
      ) : null}

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
            const kind = planChangeKind(plan.id, id);
            return (
              <li key={id}>
                <Card className={current ? "border-brand ring-1 ring-brand" : undefined}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-xl font-bold text-ink">{p.name}</h3>
                    <p className="font-semibold text-ink">
                      {formatPrice(prices.plans[id].amountCents)}/mês
                    </p>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-ink-2">
                    {p.highlights.map((h) => (
                      <li key={h}>✓ {h}</li>
                    ))}
                  </ul>
                  {current ? (
                    <p className="mt-3 text-sm font-semibold text-brand">Seu plano atual</p>
                  ) : null}
                  {canChange && current && pendingPlan ? (
                    <div className="mt-3">
                      <PlanButton plan={id} label="Manter este plano" variant="secondary" />
                    </div>
                  ) : null}
                  {canChange && !current ? (
                    pendingPlan === id ? (
                      <p className="mt-3 text-sm font-semibold text-ink-2">
                        Troca agendada para a próxima cobrança
                      </p>
                    ) : (
                      <div className="mt-3 space-y-1">
                        <PlanButton
                          plan={id}
                          label={`Mudar para o ${p.name}`}
                          variant={kind === "upgrade" ? "primary" : "outline"}
                        />
                        <p className="text-xs text-ink-2">
                          {kind === "upgrade"
                            ? "Vale na hora. Neste mês você paga só a diferença proporcional."
                            : `Vale a partir da próxima cobrança${periodEnd ? ` (${day(periodEnd)})` : ""}, sem reembolso.`}
                        </p>
                      </div>
                    )
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
        {!manage ? (
          <p className="text-sm text-ink-2">Só o dono do negócio pode mudar a assinatura.</p>
        ) : null}
      </section>

      <section aria-labelledby="faturas-titulo" className="space-y-3">
        <h2 id="faturas-titulo" className="font-display text-lg font-bold">
          Faturas
        </h2>
        {(invoices ?? []).length === 0 ? (
          <Card>
            <p className="text-ink-2">
              {courtesy ? "Sem faturas: sua assinatura não tem cobrança." : "Nenhuma fatura ainda."}
            </p>
          </Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {(invoices ?? []).map((inv) => {
                const st = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.open;
                const first = (inv.lines as { description?: string }[] | null)?.[0]?.description;
                return (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-semibold text-ink">{formatPrice(inv.amount_cents)}</p>
                      <p className="text-sm text-ink-2">
                        {day(inv.created_at)}
                        {first ? ` · ${first}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      {inv.hosted_url ? (
                        <a
                          href={inv.hosted_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-brand underline underline-offset-2"
                        >
                          Ver fatura
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      {manage && sub && !courtesy ? (
        <section aria-labelledby="pagamento-titulo" className="space-y-3">
          <h2 id="pagamento-titulo" className="font-display text-lg font-bold">
            Pagamento
          </h2>
          <Card className="space-y-4">
            <CardButton mock={isMockBilling() && sub.provider === "mock"} />
            <CancelControls
              scheduled={sub.cancel_at_period_end}
              endsOn={periodEnd ? day(periodEnd) : null}
            />
          </Card>
        </section>
      ) : null}
    </PageBody>
  );
}
