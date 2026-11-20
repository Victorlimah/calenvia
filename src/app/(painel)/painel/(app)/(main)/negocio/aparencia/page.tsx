import type { Metadata } from "next";
import { AppearanceEditor } from "@/components/painel/appearance-editor";
import { requirePermission } from "@/lib/business/current";
import { segmentLabel } from "@/lib/business/segments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SectionHeader, TabBody } from "@/components/painel/page-header";

export const metadata: Metadata = { title: "Aparência da página — Calenvia" };

export default async function AjustesAparenciaPage() {
  const { business: b } = await requirePermission("settings.manage");
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
    <TabBody wide>
      <SectionHeader
        title="Aparência da página"
        back={{ href: "/negocio", label: "Dados e página" }}
        description="Deixe a página com a cara do seu negócio."
      />
      <AppearanceEditor
        business={{
          id: b.id,
          name: b.name,
          segmentLabel: segmentLabel(b.segment),
          accent_color: b.accent_color,
          theme: b.theme,
          headline: b.headline,
          subheadline: b.subheadline,
          logo_url: b.logo_url,
          logo_alt_url: b.logo_alt_url,
          cover_url: b.cover_url,
        }}
        photos={photos ?? []}
        testimonials={testimonials ?? []}
      />
    </TabBody>
  );
}
