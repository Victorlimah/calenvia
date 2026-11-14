import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerMessages } from "@/components/painel/customer-messages";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Badge, Card } from "@/components/ui";
import { STATUS_LABELS, STATUS_TONES } from "@/lib/agenda/status";
import { requireReadyBusiness } from "@/lib/business/current";
import { formatDayLabel, formatTime } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { formatPhone, waMeLink } from "@/lib/phone";
import { canSendAutomaticMessages } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CustomerNameForm } from "./customer-name-form";
import { PrivacyCard } from "./privacy-card";

export const metadata: Metadata = { title: "Cliente — Calenvia" };

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await requireReadyBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("customer_summaries")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!c || !c.id) notFound();
  const { data: raw } = await supabase
    .from("customers")
    .select("erased_at")
    .eq("id", c.id)
    .single();
  const { data: history } = await supabase
    .from("appointments")
    .select("id, starts_at, status, price_cents, services(name), staff_members(name)")
    .eq("customer_id", c.id)
    .eq("business_id", business.id)
    .order("starts_at", { ascending: false })
    .limit(50);
  const tz = business.timezone;

  return (
    <PageBody>
      <PageHeader
        title={c.name ?? "Cliente"}
        description={formatPhone(c.whatsapp ?? "")}
        back={{ href: "/clientes", label: "Clientes" }}
      />

      <section aria-label="Números do cliente" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Visitas", String(c.visits ?? 0)],
          ["Faltas", String(c.no_shows ?? 0)],
          ["Total gasto", formatPrice(c.total_spent_cents ?? 0)],
          ["Última visita", c.last_visit_at ? formatDayLabel(new Date(c.last_visit_at), tz) : "—"],
        ].map(([k, v]) => (
          <Card key={k} className="p-3">
            <p className="text-xs text-muted">{k}</p>
            <p className="font-display text-lg font-bold text-ink first-letter:uppercase">{v}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={waMeLink(c.whatsapp ?? "")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 font-semibold"
        >
          Chamar no WhatsApp
        </a>
        <Link
          href={`/novo?cliente=${c.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-brand px-4 font-semibold text-white"
        >
          Novo agendamento
        </Link>
      </div>

      <CustomerNameForm customerId={c.id} name={c.name ?? ""} />

      {canSendAutomaticMessages(business) ? (
        <CustomerMessages customerId={c.id} optedOut={Boolean(c.opted_out_at)} />
      ) : null}

      <PrivacyCard customerId={c.id} erased={Boolean(raw?.erased_at)} />

      <section aria-labelledby="historico" className="space-y-2">
        <h2 id="historico" className="font-display text-lg font-bold">
          Histórico
        </h2>
        {history?.length ? (
          <ul className="space-y-2">
            {history.map((a) => {
              const st = a.status as keyof typeof STATUS_LABELS;
              const start = new Date(a.starts_at);
              return (
                <li key={a.id}>
                  <Link href={`/agendamento/${a.id}`} className="block">
                    <Card className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink first-letter:uppercase">
                          {formatDayLabel(start, tz)}, {formatTime(start, tz)}
                        </p>
                        <p className="truncate text-sm text-ink-2">
                          {a.services?.name} · {a.staff_members?.name} ·{" "}
                          {formatPrice(a.price_cents)}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONES[st]}>{STATUS_LABELS[st]}</Badge>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-2">Nenhum agendamento ainda.</p>
        )}
      </section>
    </PageBody>
  );
}
