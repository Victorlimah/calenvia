import "server-only";
import type { StudioProps } from "@/components/painel/theme-studio";
import type { Business } from "@/lib/business/current";
import { businessUrl } from "@/lib/hosts";
import { getPublicCatalog, getPublicPageContent, type PublicBusiness } from "@/lib/public/business";
import { buildPageData } from "@/lib/public/page-data";
import { parseTheme } from "@/lib/themes/resolve";
import { TEMPLATES } from "@/lib/themes/registry";
import { sortTemplatesForSegment } from "@/lib/themes/suggest";

/** Dados do estúdio de temas (CAL-148): a página do próprio negócio + o tema salvo. */
export async function loadStudioProps(business: Business): Promise<StudioProps> {
  const theme = parseTheme(business.theme, business.accent_color);
  const [{ services, staff }, content] = await Promise.all([
    getPublicCatalog(business.id),
    getPublicPageContent(business.id),
  ]);
  const data = buildPageData(
    business as unknown as PublicBusiness,
    theme,
    services,
    staff,
    content,
  );
  // CAL-149: os templates indicados para o segmento primeiro, com selo.
  const { order, recommended } = sortTemplatesForSegment(
    TEMPLATES.map((t) => t.meta),
    business.segment,
  );
  return {
    order,
    recommended,
    segmentLabel: data.segmentLabel,
    businessId: business.id,
    data,
    initialTheme: theme,
    accent: business.accent_color,
    logoUrl: business.logo_url,
    logoAltUrl: business.logo_alt_url,
    publicUrl: businessUrl(business.slug, "/"),
  };
}
