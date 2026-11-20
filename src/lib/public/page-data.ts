import "server-only";
import type { PageData } from "@/components/negocio/page-data";
import { segmentLabel } from "@/lib/business/segments";
import { todayIn, weekdayOf } from "@/lib/dates";
import { canSendAutomaticMessages } from "@/lib/plans";
import { buildFaq } from "@/lib/public/faq";
import { logoPlacements, pickLogo } from "@/lib/themes/logo";
import type { Theme } from "@/lib/themes/schema";
import type { getPublicPageContent, PublicBusiness, PublicService, PublicStaff } from "./business";

type Content = Awaited<ReturnType<typeof getPublicPageContent>>;

/** Dados do banco → dados prontos da página pública (CAL-144). */
export function buildPageData(
  business: PublicBusiness,
  theme: Theme,
  services: PublicService[],
  staff: PublicStaff[],
  content: Content,
): PageData {
  return {
    name: business.name,
    slug: business.slug,
    segment: business.segment,
    segmentLabel: segmentLabel(business.segment),
    headline: business.headline,
    subheadline: business.subheadline,
    coverUrl: business.cover_url,
    logo: {
      url: pickLogo({
        name: business.name,
        logoUrl: business.logo_url,
        logoAltUrl: business.logo_alt_url,
        mode: theme.palette.mode,
        show: theme.logo.show,
      }).url,
      placements: logoPlacements(theme),
    },
    address: business.address,
    addressReference: business.address_reference,
    services,
    staff,
    photos: content.photos,
    testimonials: content.testimonials,
    rating: content.rating,
    hours: content.hours,
    breaks: content.breaks,
    todayWeekday: weekdayOf(todayIn(business.timezone)),
    faq: buildFaq(business),
    automaticMessages: canSendAutomaticMessages(business),
  };
}
