"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const input = z.object({ customerId: z.string().uuid(), enabled: z.boolean() });

/** Liga/desliga as mensagens automáticas de um cliente (opt-out, CAL-073). */
export async function setCustomerMessagesAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ opted_out_at: parsed.data.enabled ? null : new Date().toISOString() })
    .eq("id", parsed.data.customerId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: parsed.data.enabled
      ? "Mensagens automáticas ligadas para este cliente."
      : "Este cliente não vai mais receber mensagens automáticas.",
  };
}

const renameInput = z.object({
  customerId: z.string().uuid(),
  name: z.string().trim().min(2, "Informe o nome.").max(80),
});

export async function renameCustomerAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = renameInput.safeParse(raw);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nome inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.customerId)
    .eq("business_id", business.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Nome salvo." };
}
