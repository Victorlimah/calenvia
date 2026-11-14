import "server-only";
import { cache } from "react";
import { businessUrl } from "@/lib/hosts";
import { canManageByLink } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PublicBusiness } from "./business";

export type PublicAppointment = {
  id: string;
  code: string;
  status: string;
  start: Date;
  end: Date;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  staffId: string;
  staffName: string;
  customerName: string;
  customerWhatsapp: string;
};

/** Agendamento pelo código (6 caracteres), sempre dentro do negócio do subdomínio. */
export const getPublicAppointment = cache(
  async (businessId: string, rawCode: string): Promise<PublicAppointment | null> => {
    const code = rawCode.toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code)) return null;
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("appointments")
      .select(
        "id, manage_code, status, starts_at, ends_at, price_cents, customer_name, customer_whatsapp, service_id, staff_member_id, services(name, duration_min), staff_members(name)",
      )
      .eq("business_id", businessId)
      .eq("manage_code", code)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      code: data.manage_code,
      status: data.status,
      start: new Date(data.starts_at),
      end: new Date(data.ends_at),
      serviceId: data.service_id,
      serviceName: data.services?.name ?? "Serviço",
      durationMin: data.services?.duration_min ?? 0,
      priceCents: data.price_cents,
      staffId: data.staff_member_id,
      staffName: data.staff_members?.name ?? "",
      customerName: data.customer_name,
      customerWhatsapp: data.customer_whatsapp,
    };
  },
);

/** Link que vai na mensagem: gerenciar (Pro/Pro+) ou a página do negócio (Básico). */
export function manageLinkFor(
  business: Pick<PublicBusiness, "slug" | "plan" | "plan_status">,
  code: string,
) {
  return canManageByLink(business)
    ? businessUrl(business.slug, `/gerenciar/${code}`)
    : businessUrl(business.slug, "/");
}
