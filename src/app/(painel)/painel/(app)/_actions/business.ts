"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { getCurrentBusiness, requireBusiness } from "@/lib/business/current";
import { checkSlugAvailability, type SlugCheck } from "@/lib/business/slug-availability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";
import { agendaRulesSchema, businessInfoSchema, weekHoursSchema } from "@/lib/validation/business";

export async function checkSlugAction(raw: string): Promise<SlugCheck> {
  await requireUser();
  const current = await getCurrentBusiness();
  return checkSlugAvailability(raw.trim().toLowerCase(), { ignoreBusinessId: current?.id });
}

/** Cria (onboarding) ou atualiza os dados principais do negócio. */
export async function saveBusinessInfoAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = businessInfoSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const current = await getCurrentBusiness();
  const check = await checkSlugAvailability(parsed.data.slug, { ignoreBusinessId: current?.id });
  if (!check.available) {
    return { ok: false, error: check.reason, fieldErrors: { slug: check.reason } };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = current
    ? await supabase.from("businesses").update(parsed.data).eq("id", current.id)
    : await supabase.from("businesses").insert({ ...parsed.data, owner_id: user.id });

  if (error) {
    if (isPgError(error, PG_UNIQUE_VIOLATION)) {
      const msg = "Esse endereço já está em uso.";
      return { ok: false, error: msg, fieldErrors: { slug: msg } };
    }
    console.error("saveBusinessInfo", error);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Dados salvos." };
}

export async function saveHoursAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = weekHoursSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_business_hours", {
    p_business_id: business.id,
    p_days: parsed.data,
  });
  if (error) {
    console.error("saveHours", error);
    return { ok: false, error: "Não foi possível salvar os horários." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Horários salvos." };
}

export async function saveAgendaRulesAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = agendaRulesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar as regras." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Regras salvas." };
}

export async function finishOnboardingAction(): Promise<ActionResult> {
  const business = await requireBusiness();
  const supabase = await createSupabaseServerClient();
  const [{ count: services }, { count: staff }, { count: openDays }] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_active", true),
    supabase
      .from("staff_members")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_active", true),
    supabase
      .from("business_hours")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_open", true),
  ]);
  if (!services) return { ok: false, error: "Cadastre pelo menos um serviço." };
  if (!staff) return { ok: false, error: "Cadastre pelo menos um profissional." };
  if (!openDays) return { ok: false, error: "Abra pelo menos um dia da semana." };
  if (!business.onboarding_completed_at) {
    await supabase
      .from("businesses")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", business.id);
  }
  revalidatePath("/painel", "layout");
  return { ok: true };
}
