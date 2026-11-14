"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { NO_PERMISSION, requireBusinessFor, requireMember } from "@/lib/business/current";
import { can } from "@/lib/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from "@/lib/supabase/errors";
import { z } from "zod";
import { staffSchema, weekHoursSchema } from "@/lib/validation/business";

export async function saveStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, service_ids, ...row } = parsed.data;
  const supabase = await createSupabaseServerClient();

  let staffId = id;
  if (id) {
    const { error } = await supabase
      .from("staff_members")
      .update(row)
      .eq("id", id)
      .eq("business_id", business.id);
    if (error) return { ok: false, error: "Não foi possível salvar o profissional." };
  } else {
    const { data, error } = await supabase
      .from("staff_members")
      .insert({ ...row, business_id: business.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Não foi possível cadastrar o profissional." };
    staffId = data.id;
  }

  const { error: linkError } = await supabase.rpc("set_staff_services", {
    p_staff_member_id: staffId!,
    p_service_ids: service_ids,
  });
  if (linkError) return { ok: false, error: "Salvo, mas não foi possível ligar os serviços." };

  revalidatePath("/painel", "layout");
  return { ok: true, data: { id: staffId! }, message: "Profissional salvo." };
}

/** Atalho do onboarding: "Eu mesmo atendo" (dono faz todos os serviços). */
export async function addOwnerAsStaffAction(name: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { data: services } = await supabase
    .from("services")
    .select("id")
    .eq("business_id", business.id);
  return saveStaffAction({
    name: name.trim() || "Eu",
    role: "Dono",
    is_active: true,
    service_ids: (services ?? []).map((s) => s.id),
  });
}

export async function deleteStaffAction(id: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("staff_members")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);
  if (error && isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
    await supabase
      .from("staff_members")
      .update({ is_active: false })
      .eq("id", id)
      .eq("business_id", business.id);
    revalidatePath("/painel", "layout");
    return {
      ok: true,
      message: "Esse profissional já tem agendamentos, então foi desativado em vez de excluído.",
    };
  }
  if (error) return { ok: false, error: "Não foi possível excluir o profissional." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Profissional excluído." };
}

const staffHoursInput = z.object({
  staffId: z.string().uuid(),
  days: weekHoursSchema.nullable(),
});

/** Horário próprio do profissional (CAL-036). days = null → usa o horário do negócio. */
export async function saveStaffHoursAction(input: unknown): Promise<ActionResult> {
  const member = await requireMember();
  const business = member.business;
  const parsed = staffHoursInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  // Quem não cuida dos ajustes só edita o próprio horário (CAL-112).
  if (!can(member, "settings.manage") && member.staffMemberId !== parsed.data.staffId)
    return { ok: false, error: NO_PERMISSION };
  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from("staff_members")
    .select("id")
    .eq("id", parsed.data.staffId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!staff) return { ok: false, error: "Profissional não encontrado." };
  const days = parsed.data.days?.map(({ weekday, is_open, opens_at, closes_at }) => ({
    weekday,
    is_open,
    opens_at,
    closes_at,
  }));
  const { error } = await supabase.rpc("save_staff_hours", {
    p_staff_member_id: staff.id,
    p_days: (days ?? null) as never,
  });
  if (error) return { ok: false, error: "Não foi possível salvar o horário." };
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message: days ? "Horário próprio salvo." : "Agora segue o horário do negócio.",
  };
}
