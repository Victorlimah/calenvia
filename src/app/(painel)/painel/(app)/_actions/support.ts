"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { businessDisplayHost } from "@/lib/hosts";
import { hasFeature, planOf } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const input = z.object({
  topic: z.enum(["agenda", "whatsapp", "pagina", "assinatura", "outro"]),
  message: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais (pelo menos 10 caracteres).")
    .max(2000, "Use no máximo 2000 caracteres."),
});

/** Registra um pedido de suporte (CAL-101) e avisa a equipe. Pro+ entra como prioritário. */
export async function sendSupportRequestAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const priority = hasFeature(business, "prioritySupport");
  const db = createSupabaseAdminClient();
  const { count } = await db
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((count ?? 0) >= 5)
    return { ok: false, error: "Você já enviou vários pedidos agora. Aguarde nossa resposta." };
  const { error } = await db
    .from("support_requests")
    .insert({ business_id: business.id, ...parsed.data, priority });
  if (error) return { ok: false, error: "Não foi possível enviar. Tente de novo." };

  const hook = process.env.SUPPORT_WEBHOOK_URL;
  if (hook) {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${priority ? "🔴 PRIORITÁRIO" : "🟦"} Suporte · ${business.name} (${businessDisplayHost(business.slug)}, ${planOf(business).name}) · ${parsed.data.topic}\n${parsed.data.message}`,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  }
  revalidatePath("/painel/ajuda");
  return {
    ok: true,
    message: "Recebemos seu pedido. Vamos responder pelo seu e-mail ou WhatsApp.",
  };
}
