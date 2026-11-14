import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SendWhatsAppButton } from "@/components/painel/send-whatsapp-button";
import { Alert, Badge, Card } from "@/components/ui";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import { CustomerMessages } from "@/components/painel/customer-messages";
import { UsePackageButton } from "@/components/painel/use-package-button";
import { remainingSessions, usablePackage } from "@/lib/packages";
import { RealtimeRefresh } from "@/components/painel/agenda/realtime-refresh";
import { requireReadyBusiness } from "@/lib/business/current";
import { formatDate, formatDayLabel, formatDuration, formatTime, toLocalDate } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";
import { formatPrice } from "@/lib/money";
import { formatPhone, waMeLink } from "@/lib/phone";
import { canManageByLink, canSendAutomaticMessages } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmationWaLink } from "@/lib/whatsapp/wa-link";
import { AppointmentActions } from "./appointment-actions";

export const metadata: Metadata = { title: "Agendamento — Calenvia" };

const MESSAGE_TYPES = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
  cancellation: "Cancelamento",
} as const;
const MESSAGE_STATUS = {
  queued: "Na fila",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
} as const;

export default async function AgendamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviar?: string; criado?: string }>;
}) {
  const { id } = await params;
  const { enviar, criado } = await searchParams;
  const business = await requireReadyBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: a } = await supabase
    .from("appointments")
    .select(
      "*, services(name, duration_min), staff_members(name), customers(opted_out_at), messages(id, type, status, template, sent_at, created_at)",
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!a) notFound();

  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name, staff_services(service_id)")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("name");
  const eligibleStaff = (staff ?? [])
    .filter((s) => s.staff_services.some((x) => x.service_id === a.service_id))
    .map((s) => ({ id: s.id, name: s.name }));

  const tz = business.timezone;
  const start = new Date(a.starts_at);
  const end = new Date(a.ends_at);
  const status = a.status as keyof typeof STATUS_LABELS;
  const link = canManageByLink(business)
    ? businessUrl(business.slug, `/gerenciar/${a.manage_code}`)
    : businessUrl(business.slug);
  const waConfirm = confirmationWaLink(
    a.customer_whatsapp,
    {
      customerName: a.customer_name,
      businessName: business.name,
      serviceName: a.services?.name ?? "",
      staffName: a.staff_members?.name ?? "",
      start,
      timezone: tz,
      link,
    },
    business.message_texts,
  );
  const [{ data: custPackages }, { data: usage }] = await Promise.all([
    supabase
      .from("customer_packages")
      .select("id, name, service_id, sessions_total, sessions_used, expires_at")
      .eq("customer_id", a.customer_id)
      .eq("business_id", business.id),
    supabase
      .from("package_usages")
      .select("customer_packages(name)")
      .eq("appointment_id", a.id)
      .maybeSingle(),
  ]);
  const usable =
    !usage && a.status !== "canceled" ? usablePackage(custPackages ?? [], a.service_id) : null;
  const messages = [...(a.messages ?? [])].sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
  const confirmationSent = messages.some((m) => m.type === "confirmation" && m.status !== "failed");

  return (
    <PageBody>
      <RealtimeRefresh businessId={business.id} />
      <PageHeader
        title={a.customer_name}
        back={{ href: `/?data=${toLocalDate(start, tz)}`, label: "Agenda" }}
        action={<Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>}
      />

      <Card className="p-0">
        <dl className="divide-y divide-line">
          {[
            [
              "Serviço",
              `${a.services?.name ?? ""} · ${formatDuration(a.services?.duration_min ?? 0)}`,
            ],
            ["Profissional", a.staff_members?.name ?? ""],
            [
              "Quando",
              `${formatDayLabel(start, tz)}, ${formatTime(start, tz)}–${formatTime(end, tz)}`,
            ],
            ["Valor", formatPrice(a.price_cents)],
            ["WhatsApp", formatPhone(a.customer_whatsapp)],
            ["Origem", a.source === "link" ? "Agendado pelo link" : "Agendamento manual"],
            ["Código", a.manage_code],
            ...(a.notes ? [["Observações", a.notes]] : []),
            ...(a.canceled_at ? [["Cancelado em", formatDate(new Date(a.canceled_at), tz)]] : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3">
              <dt className="text-ink-2">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {enviar && !confirmationSent && status === "confirmed" ? (
        <Alert tone="info" title="Agendamento criado">
          Toque em “Enviar confirmação no WhatsApp” para mandar a mensagem pronta ao cliente.
        </Alert>
      ) : criado ? (
        <Alert tone="success" title="Agendamento criado">
          {confirmationSent
            ? "A confirmação foi enviada automaticamente para o WhatsApp do cliente."
            : "O horário já está na sua agenda."}
        </Alert>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={waMeLink(a.customer_whatsapp)}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
        >
          Chamar no WhatsApp
        </a>
        {status === "confirmed" ? (
          <SendWhatsAppButton appointmentId={a.id} href={waConfirm} sent={confirmationSent} />
        ) : null}
      </div>

      <AppointmentActions
        appointment={{
          id: a.id,
          status,
          date: toLocalDate(start, tz),
          staffId: a.staff_member_id,
          isPast: end.getTime() < Date.now(),
        }}
        staff={eligibleStaff}
      />

      {usage ? (
        <p className="rounded-[var(--radius-control)] bg-success-50 px-4 py-3 text-sm font-semibold text-success">
          Pago com o pacote “{usage.customer_packages?.name}”.
        </p>
      ) : usable ? (
        <UsePackageButton
          appointmentId={a.id}
          customerPackageId={usable.id}
          label={`Descontar do pacote “${usable.name}” (${remainingSessions(usable)} restantes)`}
        />
      ) : null}

      {canSendAutomaticMessages(business) ? (
        <CustomerMessages
          customerId={a.customer_id}
          optedOut={Boolean(a.customers?.opted_out_at)}
        />
      ) : null}

      {messages.length ? (
        <section aria-label="Mensagens">
          <h2 className="mb-2 font-display text-lg font-bold">Mensagens</h2>
          <ul className="space-y-2 text-sm">
            {messages.map((m) => (
              <li
                key={m.id}
                className="flex justify-between rounded-xl border border-line bg-white px-4 py-3"
              >
                <span>
                  {MESSAGE_TYPES[m.type as keyof typeof MESSAGE_TYPES]}
                  {m.template === "wa.me" ? " · pelo seu WhatsApp" : " · automática"}
                </span>
                <span className="text-ink-2">
                  {MESSAGE_STATUS[m.status as keyof typeof MESSAGE_STATUS]}
                  {m.sent_at
                    ? ` · ${formatDate(new Date(m.sent_at), tz).slice(0, 5)} ${formatTime(new Date(m.sent_at), tz)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </PageBody>
  );
}
