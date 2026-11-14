"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPgError, PG_FOREIGN_KEY_VIOLATION } from "@/lib/supabase/errors";
import { serviceSchema } from "@/lib/validation/business";
import { track } from "@/lib/metrics";

const withStaff = serviceSchema.extend({ staff_ids: z.array(z.string().uuid()).optional() });

export async function saveServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = withStaff.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, price, staff_ids, ...rest } = parsed.data;
  const row = { ...rest, price_cents: price };
  const supabase = await createSupabaseServerClient();

  let serviceId = id;
  if (id) {
    const { error } = await supabase
      .from("services")
      .update(row)
      .eq("id", id)
      .eq("business_id", business.id);
    if (error) return { ok: false, error: "Não foi possível salvar o serviço." };
  } else {
    const { data: last } = await supabase
      .from("services")
      .select("sort_order")
      .eq("business_id", business.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("services")
      .insert({ ...row, business_id: business.id, sort_order: (last?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "Não foi possível criar o serviço." };
    serviceId = data.id;
    await track("first_service", { businessId: business.id });
  }

  if (staff_ids && serviceId) {
    // Liga/desliga o serviço nos profissionais escolhidos.
    await supabase.from("staff_services").delete().eq("service_id", serviceId);
    if (staff_ids.length) {
      const { data: staff } = await supabase
        .from("staff_members")
        .select("id")
        .eq("business_id", business.id)
        .in("id", staff_ids);
      if (staff?.length) {
        await supabase.from("staff_services").insert(
          staff.map((s) => ({
            business_id: business.id,
            staff_member_id: s.id,
            service_id: serviceId!,
          })),
        );
      }
    }
  }

  revalidatePath("/painel", "layout");
  return { ok: true, data: { id: serviceId! }, message: "Serviço salvo." };
}

export async function deleteServiceAction(id: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);
  if (error && isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
    await supabase
      .from("services")
      .update({ is_active: false })
      .eq("id", id)
      .eq("business_id", business.id);
    revalidatePath("/painel", "layout");
    return {
      ok: true,
      message: "Esse serviço já tem agendamentos, então foi desativado em vez de excluído.",
    };
  }
  if (error) return { ok: false, error: "Não foi possível excluir o serviço." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Serviço excluído." };
}

export async function moveServiceAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { data: list } = await supabase
    .from("services")
    .select("id, sort_order")
    .eq("business_id", business.id)
    .order("sort_order")
    .order("created_at");
  if (!list) return { ok: false, error: "Não foi possível reordenar." };
  const index = list.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return { ok: true };
  const reordered = [...list];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  await Promise.all(
    reordered.map((s, i) =>
      supabase
        .from("services")
        .update({ sort_order: i + 1 })
        .eq("id", s.id)
        .eq("business_id", business.id),
    ),
  );
  revalidatePath("/painel", "layout");
  return { ok: true };
}
