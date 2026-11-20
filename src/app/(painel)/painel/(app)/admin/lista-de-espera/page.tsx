import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { ACCESS_STATUS_LABELS } from "@/lib/access/requests";
import { formatAdminDate } from "@/lib/admin/format";
import { segmentLabel } from "@/lib/business/segments";
import { formatPhone, waMeLink } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody, AdminTitle } from "../ui";

export const metadata: Metadata = { title: "Lista de espera — Administração Calenvia" };
export const dynamic = "force-dynamic";

/** Pedidos de acesso feitos pela home (CAL-138). */
export default async function ListaDeEsperaPage() {
  const { data } = await createSupabaseAdminClient()
    .from("access_requests")
    .select("id, created_at, name, business_name, whatsapp, segment, city, status")
    .order("created_at", { ascending: false })
    .limit(500);
  const rows = data ?? [];
  return (
    <AdminBody>
      <AdminTitle
        title="Lista de espera"
        description="Quem pediu acesso pela home. Chame no WhatsApp e, se fizer sentido, crie o convite."
      />
      <div className="flex flex-wrap gap-2">
        <a
          href="/admin/lista-de-espera/csv"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-[1.5px] border-ink bg-white px-4 text-sm font-semibold text-ink hover:bg-paper-2"
          download
        >
          Exportar CSV
        </a>
        <Link
          href="/admin/convites"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Convidar negócio
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="Ninguém na lista ainda"
          description="Os pedidos feitos em “Pedir meu acesso” na home aparecem aqui."
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line" aria-label="Pedidos de acesso">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                data-testid="access-request"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {r.business_name} <span className="font-normal text-ink-2">· {r.name}</span>
                  </p>
                  <p className="text-sm text-ink-2">
                    {formatPhone(r.whatsapp)}
                    {r.segment ? ` · ${segmentLabel(r.segment)}` : ""}
                    {r.city ? ` · ${r.city}` : ""} · {formatAdminDate(r.created_at)} ·{" "}
                    {ACCESS_STATUS_LABELS[r.status as keyof typeof ACCESS_STATUS_LABELS] ??
                      r.status}
                  </p>
                </div>
                <a
                  href={waMeLink(
                    r.whatsapp,
                    `Olá, ${r.name.split(" ")[0]}! Aqui é da Calenvia, sobre o seu pedido de acesso.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline-offset-2 hover:underline"
                >
                  Chamar no WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AdminBody>
  );
}
