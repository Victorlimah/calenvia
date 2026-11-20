"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appearanceSchema, testimonialSchema } from "@/lib/validation/business";
import { resolveTheme } from "@/lib/themes/resolve";
import { themeSchema } from "@/lib/themes/schema";

/**
 * Salva o tema (CAL-141): valida o contrato, grava `theme` e mantém `accent_color` igual à cor
 * do botão já corrigida para AA (usada no painel, no compartilhamento e nas mensagens).
 */
export async function saveThemeAction(
  input: unknown,
): Promise<ActionResult<{ adjustments: string[] }>> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = themeSchema.safeParse(input);
  if (!parsed.success) {
    const colorIssue = parsed.error.issues.find((i) => i.path.includes("palette"));
    return {
      ok: false,
      error: colorIssue
        ? colorIssue.message
        : "Tema inválido. Recarregue a página e tente de novo.",
    };
  }
  const resolved = resolveTheme(parsed.data);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("businesses")
    .update({ theme: parsed.data, accent_color: resolved.colors.primary })
    .eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar as cores." };
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    data: { adjustments: resolved.adjustments },
    message: "Cores salvas. Sua página já está com o visual novo.",
  };
}

export async function saveAppearanceAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      headline: parsed.data.headline,
      subheadline: parsed.data.subheadline,
      ...(parsed.data.accent_color ? { accent_color: parsed.data.accent_color.toUpperCase() } : {}),
    })
    .eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar a aparência." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Aparência salva." };
}

export async function addTestimonialAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = testimonialSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("business_testimonials")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if ((count ?? 0) >= 10) return { ok: false, error: "Limite de 10 depoimentos." };
  const { error } = await supabase
    .from("business_testimonials")
    .insert({ ...parsed.data, business_id: business.id, sort_order: (count ?? 0) + 1 });
  if (error) return { ok: false, error: "Não foi possível salvar o depoimento." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Depoimento adicionado." };
}

export async function removeTestimonialAction(id: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  await supabase.from("business_testimonials").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/painel", "layout");
  return { ok: true };
}
