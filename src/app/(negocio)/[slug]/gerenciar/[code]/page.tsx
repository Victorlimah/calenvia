import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { customerManagePolicy } from "@/lib/booking/manage-policy";
import { formatDayLabel, formatDuration, formatTime } from "@/lib/dates";
import { waMeLink } from "@/lib/phone";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";
import { noticeText } from "@/lib/public/faq";
import { ManageClient } from "./manage-client";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

type Props = { params: Promise<{ slug: string; code: string }> };

export const metadata: Metadata = { title: "Remarcar ou cancelar", robots: { index: false } };

export default async function GerenciarPage({ params }: Props) {
  const { slug, code } = await params;
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  if (!(await checkRateLimit("lookup"))) {
    return (
      <main className="mx-auto max-w-xl px-4 pt-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Muitas tentativas</h1>
        <p className="mt-2 text-night-sub">{RATE_LIMIT_MESSAGE}</p>
      </main>
    );
  }
  const appt = await getPublicAppointment(business.id, code);
  if (!appt) notFound();

  const tz = business.timezone;
  const when = `${formatDayLabel(appt.start, tz)} às ${formatTime(appt.start, tz)}`;
  const policy = customerManagePolicy(business, appt);
  const deadline = policy.deadline
    ? `${formatDayLabel(policy.deadline, tz)} às ${formatTime(policy.deadline, tz)}`
    : null;
  const talk = business.whatsapp
    ? waMeLink(
        business.whatsapp,
        `Olá! Tenho um horário de ${appt.serviceName} ${when} (código ${appt.code}).`,
      )
    : null;

  const blocked: Record<string, string> = {
    plan: `Para remarcar ou cancelar, fale com a ${business.name} pelo WhatsApp.`,
    canceled: "Este agendamento já foi cancelado.",
    past: "Este horário já passou.",
    done: "Este agendamento já foi atendido.",
    deadline: `O prazo para remarcar ou cancelar pelo link era até ${deadline}. Fale com a ${business.name} pelo WhatsApp.`,
  };

  return (
    <main className="mx-auto max-w-xl px-4 pt-10 pb-16">
      <h1 className="font-display text-3xl font-extrabold">Seu agendamento</h1>
      <p className="mt-1 text-night-sub">{business.name}</p>

      <dl className="mt-6 divide-y divide-white/10 rounded-[var(--radius-card)] border border-white/10 bg-white/5">
        {[
          ["Serviço", `${appt.serviceName} · ${formatDuration(appt.durationMin)}`],
          ["Profissional", appt.staffName],
          ["Quando", when],
          ["Código", appt.code],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-5 py-3.5">
            <dt className="text-night-sub">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {policy.ok ? (
        <>
          <p className="mt-4 text-sm text-night-sub">
            {business.cancel_notice_min > 0
              ? `Você pode remarcar ou cancelar até ${deadline} (${noticeText(business.cancel_notice_min)} antes).`
              : "Você pode remarcar ou cancelar até o horário."}
          </p>
          <ManageClient
            slug={slug}
            code={appt.code}
            serviceId={appt.serviceId}
            staffId={appt.staffId}
            timezone={tz}
            accent={business.accent_color}
          />
        </>
      ) : (
        <div className="mt-8 space-y-3">
          <p
            role="status"
            className="rounded-xl border border-white/10 bg-white/5 p-4 font-semibold"
          >
            {blocked[policy.reason]}
          </p>
          {talk && policy.reason !== "canceled" ? (
            <a
              href={talk}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Falar no WhatsApp
            </a>
          ) : null}
          {policy.reason === "canceled" ? (
            <Link
              href="/agendar"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-[var(--radius-control)] text-[17px] font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Agendar de novo
            </Link>
          ) : null}
        </div>
      )}

      <p className="mt-10 text-center">
        <Link href="/" className="text-sm underline underline-offset-4">
          Voltar para a página da {business.name}
        </Link>
      </p>
    </main>
  );
}
