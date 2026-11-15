import type { Metadata } from "next";
import { Badge, EmptyState } from "@/components/ui";
import { openViewAs } from "@/lib/admin/view-as-server";
import { formatDuration } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminBody } from "../../../../ui";
import { ViewSection } from "../ui";

export const metadata: Metadata = { title: "Serviços do cliente — Administração Calenvia" };

export default async function ViewAsServicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await openViewAs(id, "servicos");
  const db = createSupabaseAdminClient();
  const [services, staff] = await Promise.all([
    db
      .from("services")
      .select("id, name, description, duration_min, price_cents, is_active, is_featured")
      .eq("business_id", business.id)
      .order("sort_order")
      .order("name"),
    db
      .from("staff_members")
      .select("id, name, role, is_active, staff_services(services(name))")
      .eq("business_id", business.id)
      .order("name"),
  ]);

  return (
    <AdminBody>
      <h1 className="font-display text-2xl font-extrabold text-ink">Serviços e profissionais</h1>

      <ViewSection title="Serviços">
        {(services.data ?? []).length === 0 ? (
          <EmptyState title="Nenhum serviço cadastrado" />
        ) : (
          <ul className="divide-y divide-line" aria-label="Serviços">
            {(services.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{s.name}</p>
                  {s.description ? <p className="text-ink-2">{s.description}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ink-2">
                    {formatDuration(s.duration_min)} · {formatPrice(s.price_cents)}
                  </span>
                  {s.is_featured ? <Badge tone="brand">Mais pedido</Badge> : null}
                  {s.is_active ? null : <Badge>Inativo</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ViewSection>

      <ViewSection title="Profissionais">
        {(staff.data ?? []).length === 0 ? (
          <EmptyState title="Nenhum profissional cadastrado" />
        ) : (
          <ul className="divide-y divide-line" aria-label="Profissionais">
            {(staff.data ?? []).map((m) => (
              <li key={m.id} className="space-y-0.5 py-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {m.name}
                  {m.role ? <span className="font-normal text-muted">{m.role}</span> : null}
                  {m.is_active ? null : <Badge>Inativo</Badge>}
                </p>
                <p className="text-ink-2">
                  Faz:{" "}
                  {m.staff_services
                    .map((ss) => ss.services?.name)
                    .filter(Boolean)
                    .join(", ") || "nenhum serviço"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ViewSection>
    </AdminBody>
  );
}
