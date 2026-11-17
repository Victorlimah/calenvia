import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { lastAccessLabel } from "@/lib/admin/directory";
import { segmentLabel } from "@/lib/business/segments";
import { BusinessHeaderActions } from "./header-actions";
import {
  type AdminBusinessInput,
  AUDIT_FIELD_LABELS,
  describeAuditEntry,
  formatChangeValue,
  PLAN_STATUS_LABELS,
} from "@/lib/admin/business-update";
import { formatAdminDate, formatAdminDateTime, statusTone } from "@/lib/admin/format";
import { periodOf } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { maxMembers, monthlyMessageLimit, PLANS, planOf, type PlanStatus } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../../ui";
import { BusinessAdminForm } from "./business-admin-form";
import { BillingSimulations } from "./billing-simulations";
import { BusinessAddons, CourtesyButton } from "./business-addons";
import { loadSubscriptionItems } from "@/lib/billing/items";
import { addonsForPlan } from "@/lib/billing/prices";
import { getCurrentPrices } from "@/lib/billing/prices-server";
import { isMockBilling } from "@/lib/billing/config";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Negócio — Administração Calenvia" };

type AuditChanges = Record<string, { from: unknown; to: unknown }>;

const TABS = [
  { key: "resumo", label: "Resumo" },
  { key: "cobranca", label: "Plano e cobrança" },
  { key: "extras", label: "Extras e limites" },
  { key: "equipe", label: "Equipe" },
  { key: "atividade", label: "Atividade" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function AdminBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba } = await searchParams;
  const tab: TabKey = TABS.some((t) => t.key === aba) ? (aba as TabKey) : "resumo";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createSupabaseAdminClient();
  const { data: business } = await db.from("businesses").select("*").eq("id", id).maybeSingle();
  if (!business) notFound();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const period = periodOf(new Date(), business.timezone);
  const [owner, members, invites, usage, appts, note, audit, subscription, invoices] =
    await Promise.all([
      db.auth.admin.getUserById(business.owner_id),
      db
        .from("business_members")
        .select("id, role, display_name, email, status, created_at")
        .eq("business_id", id)
        .eq("status", "active")
        .order("created_at"),
      db
        .from("business_invitations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", id)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString()),
      db
        .from("message_usage")
        .select("count")
        .eq("business_id", id)
        .eq("period", period)
        .maybeSingle(),
      db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", id)
        .gte("created_at", since30),
      db.from("admin_business_notes").select("notes").eq("business_id", id).maybeSingle(),
      db
        .from("admin_audit_log")
        .select("id, admin_email, action, changes, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("subscriptions")
        .select(
          "provider, status, plan, current_period_end, cancel_at_period_end, pending_plan, past_due_since",
        )
        .eq("business_id", id)
        .neq("status", "canceled")
        .maybeSingle(),
      db
        .from("invoices")
        .select("id, amount_cents, status, created_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
  const sub = subscription.data;
  const [{ items, totalCents }, prices, { data: addonRows }] = await Promise.all([
    loadSubscriptionItems(db, id),
    getCurrentPrices({ fresh: true }),
    db.from("business_addons").select("id, note").eq("business_id", id).is("removed_at", null),
  ]);
  const activeAddons = items
    .filter((i) => i.kind !== "plan")
    .map((i) => ({
      id: i.id!,
      label: i.description,
      quantity: i.quantity,
      amountCents: i.amount_cents,
      custom: i.kind === "custom",
      note: addonRows?.find((r) => r.id === i.id)?.note ?? null,
    }));

  const plan = planOf(business);
  const ownerEmail = owner.data.user?.email ?? "—";
  const memberList = members.data ?? [];
  const pending = invites.count ?? 0;
  const max = maxMembers(business);
  const msgLimit = monthlyMessageLimit(business);
  const used = usage.data?.count ?? 0;

  const defaults: Record<keyof AdminBusinessInput, string> = {
    plan: business.plan,
    plan_status: business.plan_status,
    member_limit_override: business.member_limit_override?.toString() ?? "",
    message_limit_override: business.message_limit_override?.toString() ?? "",
    notes: note.data?.notes ?? "",
  };

  const canCourtesy = !sub || (sub.provider === "manual" && business.plan_status !== "active");
  const tabHref = (k: TabKey) =>
    k === "resumo" ? `/admin/negocios/${business.id}` : `/admin/negocios/${business.id}?aba=${k}`;

  return (
    <AdminBody>
      <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-line bg-paper/95 px-4 pt-2 pb-0 backdrop-blur md:top-0 md:-mx-8 md:px-8">
        <AdminTitle title={business.name} back={{ href: "/admin", label: "Negócios" }} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="brand">{plan.name}</Badge>
            <Badge tone={statusTone(business.plan_status)}>
              {PLAN_STATUS_LABELS[business.plan_status as PlanStatus] ?? business.plan_status}
            </Badge>
            {sub?.provider === "manual" ? <Badge>Cortesia</Badge> : null}
            {business.onboarding_completed_at ? null : <Badge>Cadastro incompleto</Badge>}
          </div>
          <BusinessHeaderActions
            businessId={business.id}
            name={business.name}
            status={business.plan_status}
            canCourtesy={canCourtesy}
            enterHref={`/admin/negocios/${business.id}/visao`}
          />
        </div>
        <nav aria-label="Seções do negócio" className="-mx-1 overflow-x-auto">
          <ul className="flex min-w-max gap-1">
            {TABS.map((t) => (
              <li key={t.key}>
                <Link
                  href={tabHref(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap ${
                    tab === t.key
                      ? "border-brand text-brand"
                      : "border-transparent text-ink-2 hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {tab === "resumo" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2 text-sm">
            <h2 className="font-display text-lg font-bold text-ink">Dados</h2>
            <Info label="Dono" value={ownerEmail} />
            <Info label="WhatsApp" value={business.whatsapp ?? "—"} />
            <Info label="Segmento" value={segmentLabel(business.segment)} />
            <Info label="Endereço" value={business.address ?? "—"} />
            <Info label="Fuso horário" value={business.timezone} />
            <Info label="Criado em" value={formatAdminDate(business.created_at)} />
            <Info
              label="Último acesso do dono"
              value={lastAccessLabel(owner.data.user?.last_sign_in_at ?? null)}
            />
            <p>
              <a
                href={businessUrl(business.slug)}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand underline"
              >
                Abrir página pública ({business.slug})
              </a>
            </p>
            <p>
              <Link
                href={`/admin/mensagens?negocio=${business.id}`}
                className="font-semibold text-brand underline"
              >
                Ver mensagens com falha
              </Link>
            </p>
          </Card>

          <Card className="space-y-2 text-sm">
            <h2 className="font-display text-lg font-bold text-ink">Uso</h2>
            <Info
              label="Pessoas com acesso"
              value={`${memberList.length + pending} de ${max ?? "ilimitado"}${pending ? ` (${pending} convite${pending > 1 ? "s" : ""} pendente${pending > 1 ? "s" : ""})` : ""}`}
            />
            <Info label={`Mensagens em ${period}`} value={`${used} de ${msgLimit}`} />
            <Info label="Agendamentos (30 dias)" value={String(appts.count ?? 0)} />
            <Info label="Valor por mês" value={formatPrice(totalCents)} />
            <p className="text-muted">
              Padrão do {plan.name}: {plan.maxMembers ?? "ilimitado"}{" "}
              {plan.maxMembers === 1 ? "pessoa" : "pessoas"} e {plan.monthlyMessages ?? 0} mensagens
              por mês.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === "cobranca" ? (
        <Card className="space-y-3 text-sm" aria-labelledby="cobranca-admin">
          <h2 id="cobranca-admin" className="font-display text-lg font-bold text-ink">
            Cobrança
          </h2>
          {sub ? (
            <>
              <Info
                label="Forma de cobrança"
                value={PROVIDER_LABELS[sub.provider] ?? sub.provider}
              />
              <Info
                label="Situação da assinatura"
                value={PLAN_STATUS_LABELS[sub.status as PlanStatus] ?? sub.status}
              />
              <Info
                label="Ciclo atual até"
                value={sub.current_period_end ? formatAdminDate(sub.current_period_end) : "—"}
              />
              {sub.pending_plan ? (
                <Info
                  label="Troca agendada"
                  value={`para ${PLANS[sub.pending_plan as keyof typeof PLANS]?.name ?? sub.pending_plan}`}
                />
              ) : null}
              {sub.cancel_at_period_end ? (
                <Info label="Cancelamento" value="agendado para o fim do ciclo" />
              ) : null}
              {sub.past_due_since ? (
                <Info label="Em atraso desde" value={formatAdminDate(sub.past_due_since)} />
              ) : null}
            </>
          ) : (
            <p className="text-muted">Sem assinatura aberta.</p>
          )}
          {(invoices.data ?? []).length > 0 ? (
            <>
              <h3 className="pt-2 font-semibold text-ink">Últimas faturas</h3>
              <ul className="divide-y divide-line">
                {(invoices.data ?? []).map((i) => (
                  <li key={i.id} className="flex justify-between gap-2 py-1.5">
                    <span className="text-muted">{formatAdminDate(i.created_at)}</span>
                    <span className="text-ink">
                      {formatPrice(i.amount_cents)} · {INVOICE_LABELS[i.status] ?? i.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Info label="Total por mês" value={formatPrice(totalCents)} />
          {canCourtesy ? (
            <div className="border-t border-line pt-3">
              <CourtesyButton businessId={business.id} />
            </div>
          ) : null}
          {isMockBilling() && sub && sub.provider !== "stripe" ? (
            <div className="space-y-2 border-t border-line pt-3">
              <p className="text-muted">Pagamento simulado: teste o ciclo de cobrança.</p>
              <BillingSimulations businessId={business.id} />
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "extras" ? (
        <>
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold text-ink">Plano e limites</h2>
            <p className="text-sm text-muted">
              Mude o plano, a situação e os limites deste negócio. Campo de limite vazio = padrão do
              plano.
            </p>
            <BusinessAdminForm
              businessId={business.id}
              defaults={defaults}
              planDefaults={Object.fromEntries(
                Object.values(PLANS).map((p) => [
                  p.id,
                  { members: p.maxMembers, messages: p.monthlyMessages ?? 0 },
                ]),
              )}
            />
          </Card>
          <Card className="space-y-3 text-sm">
            <h2 className="font-display text-lg font-bold text-ink">Extras</h2>
            <p className="text-muted">
              Itens cobrados na assinatura. Mensagens e pessoas extras somam no limite (além do
              ajuste manual acima). Mudanças entram na fatura com cobrança proporcional.
            </p>
            <BusinessAddons
              businessId={business.id}
              active={activeAddons}
              catalog={addonsForPlan(prices.addons, plan.id).map((a) => ({
                addonId: a.addonId,
                name: a.name,
                amountCents: a.amountCents,
              }))}
            />
          </Card>
        </>
      ) : null}

      {tab === "equipe" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold text-ink">Equipe</h2>
          {memberList.length === 0 ? (
            <p className="text-sm text-muted">Ninguém com acesso.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {memberList.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-ink">{m.display_name ?? m.email ?? "Sem nome"}</span>
                  <span className="text-muted">
                    {ROLE_LABELS[m.role as Role]}
                    {m.email ? ` · ${m.email}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {pending ? (
            <p className="text-sm text-muted">
              {pending} convite{pending > 1 ? "s" : ""} pendente{pending > 1 ? "s" : ""}.
            </p>
          ) : null}
        </Card>
      ) : null}

      {tab === "atividade" ? (
        <section aria-labelledby="historico" className="space-y-3">
          <h2 id="historico" className="font-display text-lg font-bold text-ink">
            Histórico da administração
          </h2>
          {(audit.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhuma alteração feita pela administração ainda.</p>
          ) : (
            <ol className="space-y-2">
              {(audit.data ?? []).map((a) => {
                const summary = describeAuditEntry(a.action, a.changes);
                return (
                  <li key={a.id}>
                    <Card className="space-y-1 text-sm">
                      <p className="text-muted">
                        {formatAdminDateTime(a.created_at)} · {a.admin_email}
                      </p>
                      {summary ? (
                        <p className="text-ink">{summary}</p>
                      ) : (
                        <ul>
                          {Object.entries((a.changes ?? {}) as AuditChanges).map(([field, c]) => (
                            <li key={field} className="text-ink">
                              <span className="font-semibold">
                                {AUDIT_FIELD_LABELS[field] ?? field}:
                              </span>{" "}
                              {formatChangeValue(field, c.from)} → {formatChangeValue(field, c.to)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </AdminBody>
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Pagamento simulado",
  stripe: "Stripe",
  manual: "Manual (sem cobrança)",
};

const INVOICE_LABELS: Record<string, string> = {
  open: "em aberto",
  paid: "paga",
  failed: "falhou",
  void: "anulada",
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </p>
  );
}
