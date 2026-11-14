"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { requireBusiness } from "@/lib/business/current";
import { canSendAutomaticMessages } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeOffsets } from "@/lib/whatsapp/message-settings";

const settingsInput = z.object({
  confirmation_enabled: z.boolean(),
  reminder_enabled: z.boolean(),
  reminder_offsets_min: z.array(z.number().int()),
  cancellation_enabled: z.boolean(),
});

/**
 * Salva os ajustes de mensagens automáticas (CAL-111). Só quem pode mexer nos ajustes do
 * negócio (hoje o dono; o gerente entra com o CAL-112) e só em plano com envio automático.
 * A tabela não aceita escrita direta do navegador: este é o único caminho.
 */
export async function saveMessageSettingsAction(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const business = await requireBusiness(); // dono do negócio (RLS)
  if (!canSendAutomaticMessages(business)) {
    return { ok: false, error: "Mensagens automáticas estão disponíveis no plano Pro." };
  }
  const parsed = settingsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Ajustes inválidos." };
  const offsets = normalizeOffsets(parsed.data.reminder_offsets_min);
  if (parsed.data.reminder_enabled && offsets.length === 0) {
    return { ok: false, error: "Escolha quando o lembrete sai (24 horas e/ou 2 horas antes)." };
  }
  const { error } = await createSupabaseAdminClient()
    .from("business_message_settings")
    .upsert({
      business_id: business.id,
      confirmation_enabled: parsed.data.confirmation_enabled,
      reminder_enabled: parsed.data.reminder_enabled,
      // Mantém uma antecedência válida guardada mesmo com o lembrete desligado.
      reminder_offsets_min: offsets.length ? offsets : [120],
      cancellation_enabled: parsed.data.cancellation_enabled,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  if (error) return { ok: false, error: "Não foi possível salvar os ajustes." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Ajustes de mensagens salvos." };
}

/** Liga/desliga as mensagens automáticas de um agendamento (CAL-111). */
export async function setAppointmentMessagesAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = z
    .object({ appointmentId: z.string().uuid(), enabled: z.boolean() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({ messages_enabled: parsed.data.enabled })
    .eq("id", parsed.data.appointmentId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: parsed.data.enabled
      ? "Mensagens automáticas ligadas para este agendamento."
      : "Este agendamento não vai receber mensagens automáticas.",
  };
}
