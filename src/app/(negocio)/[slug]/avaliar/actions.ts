"use server";

import { z } from "zod";
import { getPublicAppointment } from "@/lib/public/appointment";
import { getPublicBusiness } from "@/lib/public/business";
import { checkRateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { canReview, publicAuthorName } from "@/lib/reviews";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";

const input = z.object({
  slug: z.string().min(3).max(40),
  code: z.string().min(6).max(10),
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: z.string().trim().max(500).optional(),
});

/** Avaliação do cliente após o atendimento (CAL-106). */
export async function submitReviewAction(
  raw: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira." };
  if (!(await checkRateLimit("manage"))) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const business = await getPublicBusiness(parsed.data.slug);
  if (!business) return { ok: false, error: "Negócio não encontrado." };
  const appt = await getPublicAppointment(business.id, parsed.data.code);
  if (!appt) return { ok: false, error: "Agendamento não encontrado." };
  const check = canReview(appt, false);
  if (!check.ok) {
    return {
      ok: false,
      error:
        check.reason === "too_late"
          ? "O prazo para avaliar este atendimento já passou."
          : "Este atendimento ainda não pode ser avaliado.",
    };
  }
  const { error } = await createSupabaseAdminClient()
    .from("reviews")
    .insert({
      business_id: business.id,
      appointment_id: appt.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      author_name: publicAuthorName(appt.customerName),
    });
  if (error) {
    return {
      ok: false,
      error: isPgError(error, PG_UNIQUE_VIOLATION)
        ? "Você já avaliou este atendimento. Obrigado!"
        : "Não foi possível enviar. Tente de novo.",
    };
  }
  return { ok: true };
}
