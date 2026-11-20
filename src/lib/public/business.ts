import "server-only";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ratingSummary } from "@/lib/reviews";

/** Colunas do negócio que podem aparecer na página pública. */
const PUBLIC_BUSINESS_COLUMNS =
  "id, slug, name, segment, address, address_reference, whatsapp, instagram, timezone, accent_color, theme, logo_url, logo_alt_url, cover_url, headline, subheadline, slot_interval_min, min_notice_min, max_days_ahead, cancel_notice_min, plan, plan_status, message_limit_override, addon_messages, onboarding_completed_at";

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  segment: string | null;
  address: string | null;
  address_reference: string | null;
  whatsapp: string | null;
  instagram: string | null;
  timezone: string;
  accent_color: string;
  /** Tema guardado (CAL-140); null = padrão. Ler sempre com resolveTheme(). */
  theme: unknown;
  logo_url: string | null;
  /** Versão do logo para fundo escuro (CAL-143). */
  logo_alt_url: string | null;
  cover_url: string | null;
  headline: string | null;
  subheadline: string | null;
  slot_interval_min: number;
  min_notice_min: number;
  max_days_ahead: number;
  cancel_notice_min: number;
  plan: string;
  plan_status: string;
  message_limit_override: number | null;
  addon_messages?: number | null;
  onboarding_completed_at: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_cents: number;
  is_featured: boolean;
};

export type PublicStaff = {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  serviceIds: string[];
};

/** Negócio pelo slug (só se o onboarding terminou). Lido pelo servidor com a service role. */
export const getPublicBusiness = cache(async (slug: string): Promise<PublicBusiness | null> => {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("businesses")
    .select(PUBLIC_BUSINESS_COLUMNS)
    .eq("slug", slug)
    .not("onboarding_completed_at", "is", null)
    .maybeSingle();
  return (data as PublicBusiness | null) ?? null;
});

export const getPublicCatalog = cache(async (businessId: string) => {
  const admin = createSupabaseAdminClient();
  const [services, staff] = await Promise.all([
    admin
      .from("services")
      .select("id, name, description, duration_min, price_cents, is_featured")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    admin
      .from("staff_members")
      .select("id, name, role, photo_url, staff_services(service_id)")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name"),
  ]);
  const staffList: PublicStaff[] = (staff.data ?? []).map(({ staff_services, ...s }) => ({
    ...s,
    serviceIds: staff_services.map((x) => x.service_id),
  }));
  const servicesWithStaff = (services.data ?? []).filter((svc) =>
    staffList.some((s) => s.serviceIds.includes(svc.id)),
  );
  return { services: servicesWithStaff as PublicService[], staff: staffList };
});

export const getPublicPageContent = cache(async (businessId: string) => {
  const admin = createSupabaseAdminClient();
  const [hours, breaks, photos, testimonials, reviews] = await Promise.all([
    admin
      .from("business_hours")
      .select("weekday, is_open, opens_at, closes_at")
      .eq("business_id", businessId),
    admin
      .from("business_breaks")
      .select("weekday, starts_at, ends_at")
      .eq("business_id", businessId)
      .order("starts_at"),
    admin
      .from("business_photos")
      .select("id, url, caption")
      .eq("business_id", businessId)
      .order("sort_order"),
    admin
      .from("business_testimonials")
      .select("id, author_name, text")
      .eq("business_id", businessId)
      .order("sort_order"),
    admin
      .from("reviews")
      .select("id, rating, comment, author_name, is_published")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const allReviews = reviews.data ?? [];
  const published = allReviews
    .filter((r) => r.is_published && r.comment)
    .slice(0, 6)
    .map((r) => ({ id: r.id, author_name: r.author_name, text: r.comment!, rating: r.rating }));
  return {
    hours: hours.data ?? [],
    breaks: breaks.data ?? [],
    photos: photos.data ?? [],
    testimonials: [...(testimonials.data ?? []), ...published],
    rating: ratingSummary(allReviews.map((r) => r.rating)),
  };
});
