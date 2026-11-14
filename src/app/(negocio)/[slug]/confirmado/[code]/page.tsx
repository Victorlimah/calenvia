import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDayLabel, formatDuration, formatTime } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { confirmationText } from "@/lib/messages/templates";
import { canManageByLink, canSendAutomaticMessages } from "@/lib/plans";
import { getPublicAppointment, manageLinkFor } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";
import { formatPhone } from "@/lib/phone";

type Props = { params: Promise<{ slug: string; code: string }> };

export const metadata: Metadata = { title: "Agendamento confirmado", robots: { index: false } };

export default async function ConfirmadoPage({ params }: Props) {
  const { slug, code } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  const appt = await getPublicAppointment(business.id, code);
  if (!appt) notFound();

  const tz = business.timezone;
  const when = `${formatDayLabel(appt.start, tz)} às ${formatTime(appt.start, tz)}`;
  const automatic = canSendAutomaticMessages(business);
  const message = confirmationText({
    customerName: appt.customerName,
    businessName: business.name,
    serviceName: appt.serviceName,
    staffName: appt.staffName,
    start: appt.start,
    timezone: tz,
    link: manageLinkFor(business, appt.code),
  });
  const canceled = appt.status === "canceled";

  return (
    <main className="mx-auto max-w-xl px-4 pt-10 pb-16">
      <div className="text-center">
        <span
          aria-hidden="true"
          className="inline-flex size-16 items-center justify-center rounded-full text-3xl"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {canceled ? "×" : "✓"}
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold">
          {canceled ? "Agendamento cancelado" : "Agendamento confirmado!"}
        </h1>
        <p className="mt-2 text-night-sub">
          {canceled
            ? "Este horário foi cancelado."
            : automatic
              ? `Enviamos a confirmação para o seu WhatsApp ${formatPhone(appt.customerWhatsapp)}.`
              : `Seu horário está reservado. A ${business.name} pode falar com você pelo WhatsApp ${formatPhone(appt.customerWhatsapp)}.`}
        </p>
      </div>

      <dl className="mt-8 divide-y divide-white/10 rounded-[var(--radius-card)] border border-white/10 bg-white/5">
        {[
          ["Serviço", `${appt.serviceName} · ${formatDuration(appt.durationMin)}`],
          ["Profissional", appt.staffName],
          ["Quando", when],
          ["Valor", formatPrice(appt.priceCents)],
          ...(business.address ? [["Onde", business.address]] : []),
          ["Código", appt.code],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3.5">
            <dt className="text-night-sub">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {!canceled ? (
        <>
          <a
            href={`/confirmado/${appt.code}/calendario`}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            Adicionar ao calendário
          </a>
          {canManageByLink(business) ? (
            <Link
              href={`/gerenciar/${appt.code}`}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-white/20 font-semibold"
            >
              Remarcar ou cancelar
            </Link>
          ) : null}

          <section className="mt-10" aria-label="Mensagem de confirmação">
            <p className="mb-2 text-sm font-semibold text-night-sub">
              {automatic ? "Mensagem que você recebe no WhatsApp" : "Resumo do seu agendamento"}
            </p>
            <div className="rounded-2xl rounded-tl-sm bg-[#005c4b] p-4 text-[15px] leading-relaxed whitespace-pre-wrap text-white shadow">
              <WhatsAppFormatted text={message} />
            </div>
          </section>
        </>
      ) : null}

      <p className="mt-10 text-center">
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para a página da {business.name}
        </Link>
      </p>
    </main>
  );
}

/** Mostra *negrito* como no WhatsApp. */
function WhatsAppFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <strong key={i}>{p.slice(1, -1)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
