import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import {
  ADMIN_FIELD_LABELS,
  type AdminBusinessInput,
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

export const metadata: Metadata = { title: "Negócio — Administração Calenvia" };

type AuditChanges = Record<string, { from: unknown; to: unknown }>;

export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createSupabaseAdminClient();
  const { data: business } = await db.from("businesses").select("*").eq("id", id).maybeSingle();
  if (!business) notFound();

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const period = periodOf(new Date(), business.timezone);
  const [owner, members, invites, usage, appts, note, audit] = await Promise.all([
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
  ]);

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

  return (
    <AdminBody>
      <AdminTitle title={business.name} back={{ href: "/admin", label: "Negócios" }} />

      <div className="flex flex-wrap gap-1.5">
        <Badge tone="brand">{plan.name}</Badge>
        <Badge tone={statusTone(business.plan_status)}>
          {PLAN_STATUS_LABELS[business.plan_status as PlanStatus] ?? business.plan_status}
        </Badge>
        {business.onboarding_completed_at ? null : <Badge>Onboarding não concluído</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 text-sm">
          <h2 className="font-display text-lg font-bold text-ink">Dados</h2>
          <Info label="Dono" value={ownerEmail} />
          <Info label="WhatsApp" value={business.whatsapp ?? "—"} />
          <Info label="Segmento" value={business.segment ?? "—"} />
          <Info label="Fuso" value={business.timezone} />
          <Info label="Criado em" value={formatAdminDate(business.created_at)} />
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
        </Card>

        <Card className="space-y-2 text-sm">
          <h2 className="font-display text-lg font-bold text-ink">Uso</h2>
          <Info
            label="Pessoas com acesso"
            value={`${memberList.length + pending} de ${max ?? "ilimitado"}${pending ? ` (${pending} convite${pending > 1 ? "s" : ""} pendente${pending > 1 ? "s" : ""})` : ""}`}
          />
          <Info label={`Mensagens em ${period}`} value={`${used} de ${msgLimit}`} />
          <Info label="Agendamentos (30 dias)" value={String(appts.count ?? 0)} />
          <p className="text-muted">
            Padrão do {plan.name}: {plan.maxMembers ?? "ilimitado"}{" "}
            {plan.maxMembers === 1 ? "pessoa" : "pessoas"} e {plan.monthlyMessages ?? 0} mensagens
            por mês.
          </p>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold text-ink">Plano e limites</h2>
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

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">Equipe</h2>
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
      </Card>

      <section aria-labelledby="historico" className="space-y-3">
        <h2 id="historico" className="font-display text-lg font-bold text-ink">
          Histórico da administração
        </h2>
        {(audit.data ?? []).length === 0 ? (
          <p className="text-sm text-muted">Nenhuma alteração feita pela administração ainda.</p>
        ) : (
          <ol className="space-y-2">
            {(audit.data ?? []).map((a) => (
              <li key={a.id}>
                <Card className="space-y-1 text-sm">
                  <p className="text-muted">
                    {formatAdminDateTime(a.created_at)} · {a.admin_email}
                  </p>
                  <ul>
                    {Object.entries((a.changes ?? {}) as AuditChanges).map(([field, c]) => (
                      <li key={field} className="text-ink">
                        <span className="font-semibold">
                          {ADMIN_FIELD_LABELS[field as keyof AdminBusinessInput] ?? field}:
                        </span>{" "}
                        {formatChangeValue(field, c.from)} → {formatChangeValue(field, c.to)}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>
    </AdminBody>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </p>
  );
}
