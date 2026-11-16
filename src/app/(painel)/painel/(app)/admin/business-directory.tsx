import Link from "next/link";
import { Badge } from "@/components/ui";
import { PLAN_STATUS_LABELS } from "@/lib/admin/business-update";
import { lastAccessLabel } from "@/lib/admin/directory";
import { formatAdminDate, statusTone } from "@/lib/admin/format";
import { segmentLabel } from "@/lib/business/segments";
import { formatPrice } from "@/lib/money";
import { planOf, type PlanStatus } from "@/lib/plans";

export type DirectoryRow = {
  id: string;
  slug: string;
  name: string;
  segment: string | null;
  plan: string;
  plan_status: string;
  owner_email: string | null;
  owner_last_sign_in_at: string | null;
  created_at: string;
  monthly_cents: number;
  is_courtesy: boolean;
  appointments_this_month: number;
  onboarding_completed_at: string | null;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTone(status)}>{PLAN_STATUS_LABELS[status as PlanStatus] ?? status}</Badge>
  );
}

function Value({ row }: { row: DirectoryRow }) {
  if (row.is_courtesy) return <span className="text-muted">Cortesia (R$ 0)</span>;
  return <>{formatPrice(row.monthly_cents)}</>;
}

/** Lista de negócios: tabela no computador, cartões no celular (CAL-130). */
export function BusinessDirectory({ rows, caption }: { rows: DirectoryRow[]; caption: string }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white lg:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-2 text-ink-2">
            <tr>
              {[
                "Negócio",
                "Dono",
                "Plano",
                "Status",
                "Valor/mês",
                "Cadastro",
                "Último acesso",
                "Agend. no mês",
              ].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((b) => (
              <tr key={b.id} className="hover:bg-paper-2/60">
                <td className="max-w-[16rem] px-3 py-2.5">
                  <Link
                    href={`/admin/negocios/${b.id}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {b.name}
                  </Link>
                  <span className="block truncate text-xs text-muted">
                    {b.slug} · {segmentLabel(b.segment)}
                    {!b.onboarding_completed_at ? " · cadastro incompleto" : ""}
                  </span>
                </td>
                <td className="max-w-[14rem] truncate px-3 py-2.5 text-ink-2">
                  {b.owner_email ?? "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{planOf(b).name}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={b.plan_status} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                  <Value row={b} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                  {formatAdminDate(b.created_at)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {lastAccessLabel(b.owner_last_sign_in_at)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{b.appointments_this_month}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 lg:hidden" aria-label={caption}>
        {rows.map((b) => (
          <li key={b.id}>
            <Link
              href={`/admin/negocios/${b.id}`}
              className="block rounded-[var(--radius-card)] border border-line bg-white p-4 hover:border-brand"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-ink">{b.name}</p>
                  <p className="truncate text-sm text-muted">{b.owner_email ?? "sem e-mail"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">{planOf(b).name}</Badge>
                  <StatusBadge status={b.plan_status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-ink-2">
                <Value row={b} /> · {b.appointments_this_month} agend. no mês ·{" "}
                {lastAccessLabel(b.owner_last_sign_in_at)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
