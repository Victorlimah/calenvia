"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { NO_PERMISSION, requireWritableMember } from "@/lib/business/current";
import { canBlock } from "@/lib/permissions";
import { localDateTimeToUtc, zonedDayRange } from "@/lib/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

const blockSchema = z
  .object({
    staffId: z.string().uuid().nullable(),
    startDate: date,
    endDate: date,
    allDay: z.boolean(),
    startTime: time.optional(),
    endTime: time.optional(),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.allDay || (v.startTime && v.endTime), {
    message: "Informe início e fim.",
    path: ["startTime"],
  });

export async function createBlockAction(
  input: unknown,
): Promise<ActionResult<{ overlapping: number }>> {
  const member = await requireWritableMember();
  const business = member.business;
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const v = parsed.data;
  // Profissional só bloqueia os próprios horários (CAL-112).
  if (!canBlock(member, v.staffId)) return { ok: false, error: NO_PERMISSION };
  const tz = business.timezone;
  const start = v.allDay
    ? zonedDayRange(v.startDate, tz).start
    : localDateTimeToUtc(v.startDate, v.startTime!, tz);
  const end = v.allDay
    ? zonedDayRange(v.endDate, tz).end
    : localDateTimeToUtc(v.endDate, v.endTime!, tz);
  if (end <= start) return { ok: false, error: "O fim precisa ser depois do início." };
  if (end.getTime() - start.getTime() > 366 * 86400000)
    return { ok: false, error: "Bloqueio de no máximo 1 ano." };

  const supabase = await createSupabaseServerClient();
  if (v.staffId) {
    const { data } = await supabase
      .from("staff_members")
      .select("id")
      .eq("id", v.staffId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "Profissional não encontrado." };
  }
  const { error } = await supabase.from("time_blocks").insert({
    business_id: business.id,
    staff_member_id: v.staffId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    reason: v.reason || null,
  });
  if (error) return { ok: false, error: "Não foi possível bloquear." };

  let overlapQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .neq("status", "canceled")
    .lt("starts_at", end.toISOString())
    .gt("ends_at", start.toISOString());
  if (v.staffId) overlapQuery = overlapQuery.eq("staff_member_id", v.staffId);
  const { count } = await overlapQuery;

  revalidatePath("/painel", "layout");
  return {
    ok: true,
    data: { overlapping: count ?? 0 },
    message: count
      ? `Horário bloqueado. Atenção: há ${count} agendamento(s) nesse período — eles continuam marcados.`
      : "Horário bloqueado.",
  };
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  const { business } = await requireWritableMember();
  const supabase = await createSupabaseServerClient();
  // A RLS só deixa apagar o que o papel pode (profissional: só os próprios).
  const { data, error } = await supabase
    .from("time_blocks")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível remover." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Bloqueio removido." };
}
