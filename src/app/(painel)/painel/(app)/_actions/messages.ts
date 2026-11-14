"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MANUAL_TEMPLATE } from "@/lib/whatsapp/wa-link";

/** Registra que o dono enviou a confirmação/lembrete pelo wa.me (plano B). */
export async function markManualMessageAction(
  appointmentId: string,
  type: "confirmation" | "reminder",
): Promise<ActionResult> {
  const business = await requireBusiness();
  // Confere a posse pelo client do dono (RLS) antes de escrever com a service role.
  const supabase = await createSupabaseServerClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, customer_whatsapp")
    .eq("id", appointmentId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("messages").insert({
    business_id: business.id,
    appointment_id: appt.id,
    type,
    to_number: appt.customer_whatsapp,
    template: MANUAL_TEMPLATE,
    status: "sent",
    sent_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "Não foi possível registrar o envio." };
  revalidatePath("/painel", "layout");
  return { ok: true };
}
