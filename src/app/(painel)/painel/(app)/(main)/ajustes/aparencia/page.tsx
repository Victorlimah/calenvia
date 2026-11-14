import type { Metadata } from "next";
import { AppearanceEditor } from "@/components/painel/appearance-editor";
import { requireReadyBusiness } from "@/lib/business/current";
import { segmentLabel } from "@/lib/business/segments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/painel/page-header";

export const metadata: Metadata = { title: "Aparência da página — Calenvia" };

export default async function AjustesAparenciaPage() {
  const b = await requireReadyBusiness();
  const supabase = await createSupabaseServerClient();
  const [{ data: photos }, { data: testimonials }] = await Promise.all([
    supabase.from("business_photos").select("id, url").eq("business_id", b.id).order("sort_order"),
    supabase
      .from("business_testimonials")
      .select("id, author_name, text")
      .eq("business_id", b.id)
      .order("sort_order"),
  ]);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 pb-10 md:pt-10">
      <PageHeader
        title="Aparência da página"
        description="Deixe a página com a cara do seu negócio."
        back={{ href: "/ajustes", label: "Ajustes" }}
      />
      <AppearanceEditor
        business={{
          id: b.id,
          name: b.name,
          segmentLabel: segmentLabel(b.segment),
          accent_color: b.accent_color,
          headline: b.headline,
          subheadline: b.subheadline,
          logo_url: b.logo_url,
          cover_url: b.cover_url,
        }}
        photos={photos ?? []}
        testimonials={testimonials ?? []}
      />
    </main>
  );
}
