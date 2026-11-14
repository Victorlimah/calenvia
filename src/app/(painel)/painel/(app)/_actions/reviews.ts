"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Publica (ou tira) a avaliação dos depoimentos da página (CAL-106). */
export async function setReviewPublishedAction(
  id: string,
  published: boolean,
): Promise<ActionResult> {
  const business = await requireBusiness();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reviews")
    .update({ is_published: published })
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: published ? "Publicada na sua página." : "Tirada da sua página." };
}
