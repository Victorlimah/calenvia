import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { maskPhone } from "@/lib/admin/support";
import { openViewAs } from "@/lib/admin/view-as-server";
import { formatDate } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { onlyDigits } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody } from "../../../../ui";
import { ViewSection } from "../ui";

export const metadata: Metadata = { title: "Clientes do cliente — Administração Calenvia" };

const LIMIT = 100;

export default async function ViewAsCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const business = await openViewAs(id, "clientes");
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const db = createSupabaseAdminClient();

  let query = db
    .from("customer_summaries")
    .select("id, name, whatsapp, visits, no_shows, upcoming, last_visit_at, opted_out_at", {
      count: "exact",
    })
    .eq("business_id", business.id);
  const digits = onlyDigits(q);
  if (q.length >= 2) {
    query =
      digits.length >= 3
        ? query.like("whatsapp", `%${digits}%`)
        : query.ilike("name", `%${q.replace(/[%_]/g, "")}%`);
  }
  const { data, count, error } = await query
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .order("name")
    .limit(LIMIT);
  const customers = data ?? [];

  // Total gasto = soma dos agendamentos concluídos (a view só mostra para quem tem finance.view).
  const ids = customers.map((c) => c.id).filter((v): v is string => !!v);
  const { data: done } = ids.length
    ? await db
        .from("appointments")
        .select("customer_id, price_cents")
        .eq("business_id", business.id)
        .eq("status", "completed")
        .in("customer_id", ids)
    : { data: [] };
  const spent = new Map<string, number>();
  for (const a of done ?? [])
    spent.set(a.customer_id, (spent.get(a.customer_id) ?? 0) + (a.price_cents ?? 0));

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Clientes</h1>
      <form method="get" role="search" className="flex gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="busca"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Nome ou WhatsApp"
          className="min-h-11 flex-1 rounded-xl border border-line bg-white px-3"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </form>

      <ViewSection
        title={`${count ?? 0} ${count === 1 ? "cliente" : "clientes"}${q ? " encontrados" : ""}`}
        description={(count ?? 0) > LIMIT ? `Mostrando os ${LIMIT} mais recentes.` : undefined}
      >
        {error ? (
          <p className="text-sm text-danger">Não foi possível carregar os clientes.</p>
        ) : customers.length === 0 ? (
          <EmptyState title="Nenhum cliente" description={q ? "Mude a busca." : undefined} />
        ) : (
          <ul className="divide-y divide-line" aria-label="Clientes">
            {customers.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{c.name}</p>
                  <p className="text-ink-2">
                    {maskPhone(c.whatsapp)}
                    {c.opted_out_at ? " · não recebe mensagens" : ""}
                  </p>
                </div>
                <div className="text-right text-ink-2">
                  <p>
                    {c.visits ?? 0} {c.visits === 1 ? "visita" : "visitas"} · {c.no_shows ?? 0}{" "}
                    {c.no_shows === 1 ? "falta" : "faltas"}
                    {c.upcoming ? ` · ${c.upcoming} marcado${c.upcoming > 1 ? "s" : ""}` : ""}
                  </p>
                  <p>
                    Total gasto{" "}
                    <strong className="text-ink">{formatPrice(spent.get(c.id!) ?? 0)}</strong>
                    {" · "}
                    Última visita{" "}
                    {c.last_visit_at
                      ? formatDate(new Date(c.last_visit_at), business.timezone)
                      : "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ViewSection>
    </AdminBody>
  );
}
