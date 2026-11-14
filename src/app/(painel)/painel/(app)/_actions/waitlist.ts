"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const id = z.string().uuid();

/** Marca que o dono avisou o cliente da lista de espera (CAL-104). */
export async function markWaitlistNotifiedAction(entryId: string): Promise<ActionResult> {
  const business = await requireBusiness();
  if (!id.safeParse(entryId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("waitlist_entries")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", entryId)
    .eq("business_id", business.id);
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function removeWaitlistEntryAction(entryId: string): Promise<ActionResult> {
  const business = await requireBusiness();
  if (!id.safeParse(entryId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("waitlist_entries")
    .update({ status: "closed" })
    .eq("id", entryId)
    .eq("business_id", business.id);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Removido da lista de espera." };
}
