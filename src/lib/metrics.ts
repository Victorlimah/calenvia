import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Métricas de uso (CAL-085): funil site → cadastro → negócio → serviço → onboarding →
 * primeiro agendamento → assinatura. Sem dados pessoais. Nunca derruba a ação principal.
 * Consultar: select * from metrics_funnel(now() - interval '30 days', now()); (Supabase Studio)
 */
export type ProductEvent =
  | "site_visit"
  | "signup"
  | "business_created"
  | "first_service"
  | "onboarding_completed"
  | "first_appointment"
  | "subscription_started";

export async function track(
  name: ProductEvent,
  opts: { businessId?: string | null; props?: Record<string, string | number | boolean> } = {},
): Promise<void> {
  try {
    const { error } = await createSupabaseAdminClient()
      .from("product_events")
      .insert({ name, business_id: opts.businessId ?? null, props: opts.props ?? {} });
    // 23505: evento "primeiro X" já registrado para o negócio, esperado.
    if (error && error.code !== "23505") console.warn("[metrics]", name, error.message);
  } catch (e) {
    console.warn("[metrics]", name, e);
  }
}
