import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card } from "@/components/ui";
import { isMockBilling } from "@/lib/billing/config";
import { requireReadyMember } from "@/lib/business/current";
import { formatPrice } from "@/lib/money";
import { can } from "@/lib/permissions";
import { PLANS, type PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ApproveButton } from "./approve-button";

export const metadata: Metadata = { title: "Pagamento simulado — Calenvia" };

/** Tela do provedor mock (CAL-076): resumo e "Aprovar pagamento". Não existe com o Stripe. */
export default async function PagamentoSimuladoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isMockBilling()) notFound();
  const { id } = await params;
  const member = await requireReadyMember();
  if (!can(member, "billing.manage") || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createSupabaseAdminClient();
  const { data: session } = await db
    .from("checkout_sessions")
    .select("id, business_id, plan, price_id, addons, amount_cents, status")
    .eq("id", id)
    .eq("business_id", member.business.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: planPrice } = await db
    .from("billing_prices")
    .select("amount_cents")
    .eq("id", session.price_id)
    .single();
  const chosen = (session.addons as { addonId: string; priceId: string; quantity: number }[]) ?? [];
  const { data: addonPrices } = chosen.length
    ? await db
        .from("billing_prices")
        .select("id, amount_cents, billing_addons(name)")
        .in(
          "id",
          chosen.map((a) => a.priceId),
        )
    : { data: [] };
  const lines = [
    {
      label: `Plano ${PLANS[session.plan as PlanId].name}`,
      quantity: 1,
      amount: planPrice?.amount_cents ?? 0,
    },
    ...chosen.map((a) => {
      const p = addonPrices?.find((x) => x.id === a.priceId);
      return {
        label: (p?.billing_addons as { name: string } | null)?.name ?? "Extra",
        quantity: a.quantity,
        amount: p?.amount_cents ?? 0,
      };
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">
          Pagamento simulado
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink">Confira e aprove</h1>
        <p className="mt-1 text-ink-2">
          Nada é cobrado aqui. Com o pagamento de verdade, esta tela é a do cartão.
        </p>
      </div>
      <Card>
        <h2 className="font-display text-lg font-bold text-ink">{member.business.name}</h2>
        <ul className="mt-3 divide-y divide-line">
          {lines.map((l) => (
            <li key={l.label} className="flex justify-between gap-3 py-2 text-ink">
              <span>
                {l.label}
                {l.quantity > 1 ? ` × ${l.quantity}` : ""}
              </span>
              <span>{formatPrice(l.amount * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-ink pt-3 font-display text-xl font-bold text-ink">
          <span>Total por mês</span>
          <span>{formatPrice(session.amount_cents)}</span>
        </p>
      </Card>
      {session.status === "open" ? (
        <ApproveButton sessionId={session.id} />
      ) : (
        <Alert tone={session.status === "completed" ? "success" : "warning"}>
          {session.status === "completed"
            ? "Este pagamento já foi aprovado."
            : "Este pagamento expirou. Volte e comece de novo."}
        </Alert>
      )}
      <p className="text-center">
        <Link
          href="/assinatura/checkout"
          className="font-semibold text-brand underline underline-offset-2"
        >
          Voltar e mudar o plano
        </Link>
      </p>
    </div>
  );
}
