import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/painel/page-header";
import { Card, EmptyState } from "@/components/ui";
import { requireReadyBusiness } from "@/lib/business/current";
import { formatDate } from "@/lib/dates";
import { ratingSummary } from "@/lib/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PublishToggle } from "./publish-toggle";

export const metadata: Metadata = { title: "Avaliações — Calenvia" };

export default async function AvaliacoesPage() {
  const business = await requireReadyBusiness();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, author_name, is_published, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews = data ?? [];
  const s = ratingSummary(reviews.map((r) => r.rating));
  return (
    <PageBody>
      <PageHeader
        title="Avaliações"
        description="O que os clientes acharam. Escolha quais aparecem como depoimento na sua página."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      {reviews.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação ainda"
          description="Depois de marcar um atendimento como concluído, toque em “Pedir avaliação no WhatsApp”."
        />
      ) : (
        <>
          <Card className="p-4">
            <p className="font-display text-3xl font-extrabold">
              {s.average?.toFixed(1).replace(".", ",")}{" "}
              <span className="text-brand" aria-hidden="true">
                ★
              </span>
            </p>
            <p className="text-sm text-ink-2">
              média de {s.count} {s.count === 1 ? "avaliação" : "avaliações"}
              {s.count < 3 ? " (a nota aparece na página a partir de 3)" : ""}
            </p>
          </Card>
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <Card className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      <span className="text-brand" aria-label={`${r.rating} de 5 estrelas`}>
                        {"★".repeat(r.rating)}
                        <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                      </span>{" "}
                      {r.author_name}
                    </p>
                    <span className="text-sm text-ink-2">
                      {formatDate(new Date(r.created_at), business.timezone)}
                    </span>
                  </div>
                  {r.comment ? <p className="text-ink-2">{r.comment}</p> : null}
                  {r.comment ? <PublishToggle id={r.id} published={r.is_published} /> : null}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageBody>
  );
}
