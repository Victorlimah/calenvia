import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { SendWhatsAppButton } from "@/components/painel/send-whatsapp-button";
import { Alert, Badge, Card } from "@/components/ui";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import { CustomerMessages } from "@/components/painel/customer-messages";
import { UsePackageButton } from "@/components/painel/use-package-button";
import { remainingSessions, usablePackage } from "@/lib/packages";
import { reviewLink, reviewRequestText } from "@/lib/reviews";
import { RealtimeRefresh } from "@/components/painel/agenda/realtime-refresh";
import { APPOINTMENT_COLUMNS } from "@/lib/appointments/columns";
import { loadAppointmentPrices } from "@/lib/appointments/prices";
import { requireReadyMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { formatDate, formatDayLabel, formatDuration, formatTime, toLocalDate } from "@/lib/dates";
import { businessUrl } from "@/lib/hosts";
import { formatPrice } from "@/lib/money";
import { formatPhone, waMeLink } from "@/lib/phone";
import { canManageByLink, canSendAutomaticMessages } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmationWaLink } from "@/lib/whatsapp/wa-link";
import { AppointmentActions } from "./appointment-actions";
import { AppointmentMessagesToggle } from "@/components/painel/appointment-messages-toggle";
import {
  SKIP_REASON_LABELS,
  wasDelivered,
  type RecordedSkipReason,
} from "@/lib/whatsapp/message-settings";

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
  skipped: "Não enviada",
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
  const member = await requireReadyMember();
  const { business } = member;
  const manage = can(member, "appointments.manage_all");
  const finance = can(member, "finance.view");
  const supabase = await createSupabaseServerClient();
  const { data: a } = await supabase
    .from("appointments")
    .select(
      `${APPOINTMENT_COLUMNS}, services(name, duration_min), staff_members(name), customers(opted_out_at), messages(id, type, status, skip_reason, template, sent_at, created_at)`,
    )
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!a) notFound();
  const price = finance
    ? ((await loadAppointmentPrices(supabase, business.id, [a.id])).get(a.id) ?? null)
    : null;
  const { data: creator } = a.created_by_user_id
    ? await supabase
        .from("business_members")
        .select("display_name, email")
        .eq("business_id", business.id)
        .eq("user_id", a.created_by_user_id)
        .maybeSingle()
    : { data: null };
  const createdBy =
    creator?.display_name || creator?.email || (a.source === "link" ? "Cliente, pelo link" : null);

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
    // Pacotes são valores: só para finance.view (a RLS já devolve vazio para os outros).
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
  const { data: review } = await supabase
    .from("reviews")
    .select("rating, comment")
    .eq("appointment_id", a.id)
    .maybeSingle();
  const askReview =
    status === "completed" && !review
      ? waMeLink(
          a.customer_whatsapp,
          reviewRequestText(business, a.customer_name, reviewLink(business.slug, a.manage_code)),
        )
      : null;
  const usable =
    !usage && a.status !== "canceled" ? usablePackage(custPackages ?? [], a.service_id) : null;
  const messages = [...(a.messages ?? [])].sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
  const confirmationSent = messages.some((m) => m.type === "confirmation" && wasDelivered(m));

  return (
    <PageBody>
      <RealtimeRefresh businessId={business.id} />
      <PageHeader
        title={a.customer_name}
        back={{ href: `/agenda?data=${toLocalDate(start, tz)}`, label: "Agenda" }}
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
            ...(price !== null ? [["Valor", formatPrice(price)]] : []),
            ["WhatsApp", formatPhone(a.customer_whatsapp)],
            ["Origem", a.source === "link" ? "Agendado pelo link" : "Agendamento manual"],
            ["Código", a.manage_code],
            ...(createdBy ? [["Criado por", createdBy]] : []),
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
        {status === "confirmed" && manage ? (
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
        canManage={manage}
      />

      {review ? (
        <p className="rounded-[var(--radius-control)] border border-line bg-white px-4 py-3 text-sm">
          <strong className="text-brand">{"★".repeat(review.rating)}</strong> Avaliação do cliente
          {review.comment ? `: “${review.comment}”` : ""}
        </p>
      ) : askReview ? (
        <a
          href={askReview}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
        >
          Pedir avaliação no WhatsApp
        </a>
      ) : null}

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

      {canSendAutomaticMessages(business) && status === "confirmed" && manage ? (
        <AppointmentMessagesToggle appointmentId={a.id} enabled={a.messages_enabled} />
      ) : null}

      {canSendAutomaticMessages(business) && manage ? (
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
                  {m.skip_reason
                    ? ` (${SKIP_REASON_LABELS[m.skip_reason as RecordedSkipReason] ?? m.skip_reason})`
                    : ""}
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
