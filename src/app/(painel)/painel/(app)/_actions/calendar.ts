"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Cria (ou troca, invalidando o anterior) o link privado do calendário (CAL-107). */
export async function rotateCalendarTokenAction(): Promise<ActionResult> {
  const business = await requireBusiness();
  const token = randomBytes(24).toString("base64url");
  const { error } = await createSupabaseAdminClient()
    .from("businesses")
    .update({ calendar_token: token })
    .eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível gerar o link." };
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: business.calendar_token
      ? "Link novo gerado. O anterior parou de funcionar."
      : "Link gerado.",
  };
}

export async function disableCalendarAction(): Promise<ActionResult> {
  const business = await requireBusiness();
  await createSupabaseAdminClient()
    .from("businesses")
    .update({ calendar_token: null })
    .eq("id", business.id);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Link desativado." };
}
