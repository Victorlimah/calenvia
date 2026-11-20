import type { Metadata } from "next";
import { SectionHeader, TabBody } from "@/components/painel/page-header";
import { ThemeStudio } from "@/components/painel/theme-studio";
import { requirePermission } from "@/lib/business/current";
import { loadStudioProps } from "@/lib/public/studio-data";

export const metadata: Metadata = { title: "Temas da página — Calenvia" };

/** Galeria de temas com prévia ao vivo do próprio negócio (CAL-148). */
export default async function TemasPage() {
  const { business } = await requirePermission("settings.manage");
  const props = await loadStudioProps(business);
  return (
    <TabBody wide>
      <SectionHeader
        title="Temas da página"
        back={{ href: "/negocio/aparencia", label: "Aparência" }}
        description="Toque num tema para ver a SUA página com ele. Nada muda até você tocar em “Usar este tema”."
      />
      <ThemeStudio {...props} />
    </TabBody>
  );
}
