import type { Metadata } from "next";
import { openViewAs } from "@/lib/admin/view-as-server";
import { formatAdminDate } from "@/lib/admin/format";
import { formatDuration, periodOf } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";
import { canSendAutomaticMessages, monthlyMessageLimit, planOf } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MESSAGE_SETTINGS, REMINDER_OFFSET_OPTIONS } from "@/lib/whatsapp/message-settings";
import { AdminBody } from "../../../../ui";
import { ViewRow, ViewSection, YesNo } from "../ui";

export const metadata: Metadata = { title: "Ajustes do cliente — Administração Calenvia" };

export default async function ViewAsSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await openViewAs(id, "ajustes");
  const db = createSupabaseAdminClient();
  const period = periodOf(new Date(), business.timezone);
  const [settings, domains, usage] = await Promise.all([
    db
      .from("business_message_settings")
      .select("confirmation_enabled, reminder_enabled, reminder_offsets_min, cancellation_enabled")
      .eq("business_id", business.id)
      .maybeSingle(),
    db
      .from("custom_domains")
      .select("domain, verified_at, created_at")
      .eq("business_id", business.id),
    db
      .from("message_usage")
      .select("count")
      .eq("business_id", business.id)
      .eq("period", period)
      .maybeSingle(),
  ]);
  const s = settings.data ?? DEFAULT_MESSAGE_SETTINGS;
  const automatic = canSendAutomaticMessages(business);
  const offsets = REMINDER_OFFSET_OPTIONS.filter((o) => s.reminder_offsets_min.includes(o.min))
    .map((o) => o.label)
    .join(" e ");

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Ajustes</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <ViewSection title="Regras da agenda">
          <dl className="divide-y divide-line">
            <ViewRow label="Intervalo entre horários" value={`${business.slot_interval_min} min`} />
            <ViewRow label="Antecedência mínima" value={formatDuration(business.min_notice_min)} />
            <ViewRow label="Agenda aberta até" value={`${business.max_days_ahead} dias à frente`} />
            <ViewRow
              label="Prazo para remarcar/cancelar"
              value={formatDuration(business.cancel_notice_min)}
            />
          </dl>
        </ViewSection>

        <ViewSection
          title="Mensagens automáticas"
          description={
            automatic
              ? `Plano ${planOf(business).name}: ${usage.data?.count ?? 0} de ${monthlyMessageLimit(business)} em ${period}.`
              : `Plano ${planOf(business).name}: sem envio automático (confirmação pelo wa.me).`
          }
        >
          <dl className="divide-y divide-line">
            <ViewRow label="Confirmação" value={<YesNo value={s.confirmation_enabled} />} />
            <ViewRow label="Lembrete" value={s.reminder_enabled ? offsets || "Sim" : "Não"} />
            <ViewRow
              label="Aviso de cancelamento"
              value={<YesNo value={s.cancellation_enabled} />}
            />
          </dl>
        </ViewSection>

        <ViewSection title="Aparência">
          <dl className="divide-y divide-line">
            <ViewRow
              label="Cor de destaque"
              value={
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-4 rounded-full border border-line"
                    style={{ background: business.accent_color ?? undefined }}
                  />
                  {business.accent_color ?? "padrão"}
                </span>
              }
            />
            <ViewRow label="Logo" value={<YesNo value={!!business.logo_url} />} />
            <ViewRow label="Foto de capa" value={<YesNo value={!!business.cover_url} />} />
            <ViewRow label="Título" value={business.headline ?? "—"} />
            <ViewRow label="Subtítulo" value={business.subheadline ?? "—"} />
          </dl>
          <a
            href={businessUrl(business.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline"
          >
            Abrir página pública
          </a>
        </ViewSection>

        <ViewSection title="Domínio próprio">
          {(domains.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">Nenhum domínio próprio. Usa {business.slug}.</p>
          ) : (
            <dl className="divide-y divide-line">
              {(domains.data ?? []).map((d) => (
                <ViewRow
                  key={d.domain}
                  label={d.domain}
                  value={
                    d.verified_at
                      ? `Verificado em ${formatAdminDate(d.verified_at)}`
                      : "Aguardando verificação"
                  }
                />
              ))}
            </dl>
          )}
        </ViewSection>
      </div>
    </AdminBody>
  );
}
