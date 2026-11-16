import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BusinessDirectory, type DirectoryRow } from "../business-directory";
import { AdminBody, AdminTitle } from "../ui";

const SECTIONS = [
  {
    status: "past_due",
    title: "Pagamento atrasado",
    text: "A cobrança falhou. Se não pagarem em 7 dias, a conta é suspensa sozinha.",
  },
  {
    status: "suspended",
    title: "Suspensas",
    text: "Painel só leitura e página de agendamento fechada até pagar.",
  },
  {
    status: "pending",
    title: "Aguardando pagamento ou liberação",
    text: "Cadastraram, mas ainda não pagaram. Dá para ativar sem cobrança na tela do negócio.",
  },
  {
    status: "canceled",
    title: "Canceladas",
    text: "Pediram para cancelar. A página fica fechada.",
  },
] as const;

/** Assinaturas que precisam de atenção (CAL-129, grupo Dinheiro). */
export default async function AdminSubscriptionsPage() {
  const db = createSupabaseAdminClient();
  const results = await Promise.all(
    SECTIONS.map((s) =>
      db.rpc("admin_business_directory", { p_status: s.status, p_sort: "valor", p_limit: 50 }),
    ),
  );
  return (
    <AdminBody>
      <AdminTitle
        title="Assinaturas"
        description="Quem está com pagamento atrasado, suspenso, esperando ou cancelado."
      />
      {SECTIONS.map((s, i) => {
        const rows = (results[i].data ?? []) as unknown as (DirectoryRow & {
          total_count: number;
        })[];
        const total = Number(rows[0]?.total_count ?? 0);
        return (
          <section key={s.status} aria-labelledby={`sec-${s.status}`} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`sec-${s.status}`} className="font-display text-xl font-bold text-ink">
                {s.title} <span className="text-muted">({total})</span>
              </h2>
              {total > rows.length ? (
                <Link
                  href={`/admin?status=${s.status}`}
                  className="text-sm font-semibold text-brand"
                >
                  Ver todos
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-ink-2">{s.text}</p>
            {rows.length ? (
              <BusinessDirectory rows={rows} caption={s.title} />
            ) : (
              <p className="rounded-[var(--radius-card)] border border-line bg-white px-5 py-3 text-sm text-muted">
                Ninguém aqui.
              </p>
            )}
          </section>
        );
      })}
    </AdminBody>
  );
}
