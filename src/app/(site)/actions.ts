"use server";

import { invalid, type ActionResult } from "@/lib/action-result";
import { accessRequestSchema } from "@/lib/access/requests";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const THANKS = "Recebemos seu pedido! Vamos chamar você no WhatsApp para liberar o acesso.";

/** Lista de espera da home (CAL-138): grava o pedido de acesso. */
export async function requestAccessAction(input: unknown): Promise<ActionResult> {
  const parsed = accessRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  // Robô preencheu o campo-isca: finge que deu certo e não grava.
  if (parsed.data.website) return { ok: true, message: THANKS };
  if (!(await checkRateLimit("access"))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const v = parsed.data;
  const { error } = await createSupabaseAdminClient().from("access_requests").insert({
    name: v.name,
    business_name: v.businessName,
    whatsapp: v.whatsapp,
    segment: v.segment,
    city: v.city,
  });
  if (error) {
    await reportError(error, { source: "action", path: "site.requestAccess" });
    return { ok: false, error: "Não foi possível enviar agora. Tente pelo WhatsApp." };
  }
  return { ok: true, message: THANKS };
}
