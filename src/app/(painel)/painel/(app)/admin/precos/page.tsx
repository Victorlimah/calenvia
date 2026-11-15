import type { Metadata } from "next";
import { Badge, Card } from "@/components/ui";
import { formatAdminDate } from "@/lib/admin/format";
import { formatPrice } from "@/lib/money";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../ui";
import { AddonActiveButton, NewAddonForm, PriceForm } from "./price-forms";

export const metadata: Metadata = { title: "Preços — Administração Calenvia" };

const KIND_LABELS: Record<string, string> = {
  messages: "mensagens/mês",
  members: "pessoas na equipe",
};

export default async function AdminPrecosPage() {
  const db = createSupabaseAdminClient();
  const [{ data: prices }, { data: addons }] = await Promise.all([
    db
      .from("billing_prices")
      .select("id, product, plan, addon_id, amount_cents, is_current, created_at")
      .order("created_at", { ascending: false }),
    db
      .from("billing_addons")
      .select("id, code, name, description, kind, unit_amount, plans, is_active, sort_order")
      .neq("kind", "custom")
      .order("sort_order"),
  ]);
  const all = prices ?? [];
  const history = (pred: (p: (typeof all)[number]) => boolean) => all.filter(pred);

  return (
    <AdminBody>
      <AdminTitle title="Preços e extras" />
      <p className="text-sm text-muted">
        Mudar um preço cria uma versão nova. Quem já assina continua com o preço antigo, a não ser
        que você marque “aplicar também a quem já assina” (vale a partir do próximo ciclo, sem
        cobrança proporcional).
      </p>

      <section aria-labelledby="planos-precos" className="space-y-3">
        <h2 id="planos-precos" className="font-display text-lg font-bold text-ink">
          Planos
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const versions = history((p) => p.product === "plan" && p.plan === id);
            const current = versions.find((p) => p.is_current);
            return (
              <Card key={id} className="space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-ink">{PLANS[id].name}</h3>
                  <p className="font-semibold text-ink">
                    {current ? formatPrice(current.amount_cents) : "—"}/mês
                  </p>
                </div>
                <PriceForm target={{ product: "plan", plan: id }} label={PLANS[id].name} />
                <PriceHistory versions={versions} />
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="extras-precos" className="space-y-3">
        <h2 id="extras-precos" className="font-display text-lg font-bold text-ink">
          Extras
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(addons ?? []).map((a) => {
            const versions = history((p) => p.addon_id === a.id);
            const current = versions.find((p) => p.is_current);
            return (
              <Card key={a.id} className="space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">{a.name}</h3>
                  <p className="font-semibold text-ink">
                    {current ? formatPrice(current.amount_cents) : "—"}/mês
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.is_active ? (
                    <Badge tone="success">No catálogo</Badge>
                  ) : (
                    <Badge>Arquivado</Badge>
                  )}
                  <Badge>
                    +{a.unit_amount} {KIND_LABELS[a.kind] ?? a.kind}
                  </Badge>
                  <Badge tone="brand">
                    {a.plans.map((p) => PLANS[p as keyof typeof PLANS]?.name ?? p).join(", ")}
                  </Badge>
                </div>
                {a.description ? <p className="text-muted">{a.description}</p> : null}
                <PriceForm target={{ product: "addon", addonId: a.id }} label={a.name} />
                <AddonActiveButton addonId={a.id} active={a.is_active} />
                <PriceHistory versions={versions} />
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">Novo extra</h2>
        <NewAddonForm />
      </Card>
    </AdminBody>
  );
}

function PriceHistory({
  versions,
}: {
  versions: { id: string; amount_cents: number; is_current: boolean; created_at: string }[];
}) {
  const old = versions.filter((v) => !v.is_current);
  if (old.length === 0) return null;
  return (
    <details className="text-muted">
      <summary className="min-h-11 cursor-pointer content-center">Preços anteriores</summary>
      <ul className="space-y-1">
        {old.map((v) => (
          <li key={v.id}>
            {formatPrice(v.amount_cents)} · desde {formatAdminDate(v.created_at)}
          </li>
        ))}
      </ul>
    </details>
  );
}
