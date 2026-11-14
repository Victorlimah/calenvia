"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const input = z.object({ customerId: z.string().uuid(), enabled: z.boolean() });

/** Liga/desliga as mensagens automáticas de um cliente (opt-out, CAL-073). */
export async function setCustomerMessagesAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("appointments.manage_all");
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
  const business = await requireBusinessFor("appointments.manage_all");
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

/** LGPD (CAL-091): apaga os dados pessoais do cliente (anonimiza) a pedido dele. */
export async function eraseCustomerAction(
  raw: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const business = await requireBusinessFor("customers.erase");
  const parsed = z.object({ customerId: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("customers")
    .select("id, whatsapp")
    .eq("id", parsed.data.customerId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Cliente não encontrado." };
  const { error } = await supabase.rpc("erase_customer", { p_customer_id: before.id });
  if (error) return { ok: false, error: "Não foi possível apagar os dados." };
  const { data: after } = await supabase
    .from("customers")
    .select("whatsapp")
    .eq("id", before.id)
    .single();
  // Mensagens só são gravadas pelo servidor: troca o número também nelas.
  await createSupabaseAdminClient()
    .from("messages")
    .update({ to_number: after?.whatsapp ?? "removido" })
    .eq("business_id", business.id)
    .eq("to_number", before.whatsapp);
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: "Dados do cliente apagados.",
    data: { redirectTo: "/clientes" },
  };
}
