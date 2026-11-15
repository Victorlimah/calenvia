import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { getCurrentPrices } from "@/lib/billing/prices-server";
import { isMockBilling } from "@/lib/billing/config";
import { requireReadyMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { needsCheckout, PLAN_ORDER, PLANS, planOf } from "@/lib/plans";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Ativar assinatura — Calenvia" };

export default async function CheckoutPage() {
  const member = await requireReadyMember();
  const business = member.business;
  if (!needsCheckout(business)) redirect("/assinatura");

  const canceled = business.plan_status === "canceled";
  const title = canceled ? "Reative sua assinatura" : "Falta só ativar sua assinatura";

  if (!can(member, "billing.manage")) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
        <Card>
          <p className="text-ink-2">
            A assinatura de <strong className="text-ink">{business.name}</strong> ainda não está
            ativa. Peça para o dono do negócio entrar na Calenvia e ativar.
          </p>
        </Card>
      </div>
    );
  }

  const prices = await getCurrentPrices({ fresh: true });
  const plans = PLAN_ORDER.map((id) => ({
    id,
    name: PLANS[id].name,
    amountCents: prices.plans[id].amountCents,
    highlights: PLANS[id].highlights,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-ink-2">
          {canceled
            ? "Seus dados continuam guardados. Escolha o plano para voltar a receber agendamentos."
            : "Sua página fica no ar e começa a receber agendamentos assim que o pagamento for aprovado."}
        </p>
      </div>
      {isMockBilling() ? (
        <Alert tone="info" title="Pagamento simulado">
          Este ambiente não cobra de verdade: na próxima tela é só tocar em “Aprovar pagamento”.
        </Alert>
      ) : null}
      <CheckoutForm
        plans={plans}
        addons={prices.addons.map((a) => ({
          addonId: a.addonId,
          name: a.name,
          description: a.description,
          amountCents: a.amountCents,
          plans: a.plans,
        }))}
        initialPlan={planOf(business).id}
      />
      <p className="text-center text-sm text-ink-2">
        Cobrança mensal no cartão. Cancele quando quiser, sem multa.{" "}
        <Link href="/ajuda" className="font-semibold text-brand underline underline-offset-2">
          Dúvidas?
        </Link>
      </p>
    </div>
  );
}
