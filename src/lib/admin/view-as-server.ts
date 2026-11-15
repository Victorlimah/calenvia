import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth";
import { reportError } from "@/lib/monitoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { shouldLogView, type ViewAsPage } from "./view-as";

const UUID = /^[0-9a-f-]{36}$/i;

/** Negócio da visão "ver como o cliente" (só leitura, service role). 404 se não existir. */
export const loadViewAsBusiness = cache(async (id: string) => {
  await requirePlatformAdmin();
  if (!UUID.test(id)) notFound();
  const { data } = await createSupabaseAdminClient()
    .from("businesses")
    .select(
      "id, name, slug, timezone, plan, plan_status, accent_color, logo_url, cover_url, headline, subheadline, slot_interval_min, min_notice_min, max_days_ahead, cancel_notice_min, message_limit_override, member_limit_override, addon_messages, addon_members, whatsapp, address",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return data;
});

export type ViewAsBusiness = Awaited<ReturnType<typeof loadViewAsBusiness>>;

/**
 * Abre uma aba da visão: confere o admin, carrega o negócio e grava o acesso no histórico
 * (no máximo um registro por admin, negócio e página a cada 10 minutos).
 */
export async function openViewAs(id: string, page: ViewAsPage): Promise<ViewAsBusiness> {
  const admin = await requirePlatformAdmin();
  const business = await loadViewAsBusiness(id);
  const db = createSupabaseAdminClient();
  const { data: last } = await db
    .from("admin_audit_log")
    .select("created_at")
    .eq("action", "view_as")
    .eq("admin_user_id", admin.userId)
    .eq("business_id", business.id)
    .eq("changes->page->>to", page)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (shouldLogView(last?.created_at)) {
    const { error } = await db.from("admin_audit_log").insert({
      admin_user_id: admin.userId,
      admin_email: admin.email,
      business_id: business.id,
      action: "view_as",
      changes: { page: { from: null, to: page } },
    });
    if (error)
      await reportError(error, {
        source: "server",
        path: "admin.viewAs",
        extra: { businessId: business.id, page },
      });
  }
  return business;
}
