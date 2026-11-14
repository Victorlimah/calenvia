"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusiness } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from "@/lib/supabase/errors";
import { staffSchema } from "@/lib/validation/business";

export async function saveStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const business = await requireBusiness();
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
  const business = await requireBusiness();
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
  const business = await requireBusiness();
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
