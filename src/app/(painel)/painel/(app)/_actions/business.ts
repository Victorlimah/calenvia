"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import {
  getCurrentBusiness,
  getCurrentMember,
  NO_PERMISSION,
  requireBusinessFor,
} from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { checkSlugAvailability, type SlugCheck } from "@/lib/business/slug-availability";
import { parsePlanParam } from "@/lib/plan-param";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";
import { agendaRulesSchema, businessInfoSchema, weekHoursSchema } from "@/lib/validation/business";
import { track } from "@/lib/metrics";
import { validateCustomText } from "@/lib/messages/custom";
import { z } from "zod";
import { newRefCode, normalizeRefCode } from "@/lib/referrals";

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
  const member = await getCurrentMember();
  if (member && !can(member, "settings.manage")) return { ok: false, error: NO_PERMISSION };
  const current = member?.business ?? null;
  const check = await checkSlugAvailability(parsed.data.slug, { ignoreBusinessId: current?.id });
  if (!check.available) {
    return { ok: false, error: check.reason, fieldErrors: { slug: check.reason } };
  }

  const supabase = await createSupabaseServerClient();
  const { data: saved, error } = current
    ? await supabase
        .from("businesses")
        .update(parsed.data)
        .eq("id", current.id)
        .select("id")
        .single()
    : await supabase
        .from("businesses")
        .insert({ ...parsed.data, owner_id: user.id })
        .select("id")
        .single();

  if (error) {
    if (isPgError(error, PG_UNIQUE_VIOLATION)) {
      const msg = "Esse endereço já está em uso.";
      return { ok: false, error: msg, fieldErrors: { slug: msg } };
    }
    console.error("saveBusinessInfo", error);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
  if (!current && saved) {
    await track("business_created", { businessId: saved.id });
    // Indicação (CAL-109): código próprio e quem indicou.
    const admin = createSupabaseAdminClient();
    const ref = normalizeRefCode(user.user_metadata?.ref_code as string | undefined);
    const { data: referrer } = ref
      ? await admin.from("businesses").select("id").eq("referral_code", ref).maybeSingle()
      : { data: null };
    for (let i = 0; i < 3; i++) {
      const { error: codeError } = await admin
        .from("businesses")
        .update({
          referral_code: newRefCode(),
          referred_by: referrer && referrer.id !== saved.id ? referrer.id : null,
        })
        .eq("id", saved.id);
      if (!codeError) break;
    }
    // Plano escolhido no site (CAL-084). O dono não pode mudar o plano (privilégio de coluna):
    // gravamos pelo servidor, ainda como 'pending' até o checkout existir (CAL-076).
    const plan = parsePlanParam(user.user_metadata?.plan_intent as string | undefined);
    if (plan && plan !== "basic") {
      await createSupabaseAdminClient().from("businesses").update({ plan }).eq("id", saved.id);
    }
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Dados salvos." };
}

export async function saveHoursAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
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
  const business = await requireBusinessFor("settings.manage");
  const parsed = agendaRulesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("businesses").update(parsed.data).eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar as regras." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Regras salvas." };
}

export async function finishOnboardingAction(): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
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
    await track("onboarding_completed", { businessId: business.id });
  }
  revalidatePath("/painel", "layout");
  return { ok: true };
}

const messageTextsInput = z.object({
  confirmation: z.string().max(800).nullable(),
  reminder: z.string().max(800).nullable(),
});

/** Textos das mensagens enviadas pelo WhatsApp do dono (CAL-074). null = usar o padrão. */
export async function saveMessageTextsAction(input: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = messageTextsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Textos inválidos." };
  const texts: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};
  for (const kind of ["confirmation", "reminder"] as const) {
    const t = parsed.data[kind]?.trim();
    if (!t) continue;
    const err = validateCustomText(t);
    if (err) fieldErrors[kind] = err;
    else texts[kind] = t;
  }
  if (Object.keys(fieldErrors).length)
    return { ok: false, error: "Confira os textos destacados.", fieldErrors };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("businesses")
    .update({ message_texts: texts })
    .eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Mensagens salvas." };
}
