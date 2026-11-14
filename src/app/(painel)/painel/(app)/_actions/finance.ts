"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { parsePriceToCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const entryInput = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z.string().trim().min(1, "Informe o valor."),
  category: z.string().trim().min(1, "Escolha a categoria.").max(40),
  description: z.string().trim().max(200).optional(),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
});

export async function addFinanceEntryAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("finance.view");
  const parsed = entryInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const cents = parsePriceToCents(parsed.data.amount);
  if (!cents || cents <= 0) {
    return { ok: false, error: "Valor inválido.", fieldErrors: { amount: "Valor inválido." } };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("finance_entries").insert({
    business_id: business.id,
    kind: parsed.data.kind,
    amount_cents: cents,
    category: parsed.data.category,
    description: parsed.data.description || null,
    occurred_on: parsed.data.occurred_on,
  });
  if (error) return { ok: false, error: "Não foi possível salvar o lançamento." };
  revalidatePath("/painel/financeiro");
  return {
    ok: true,
    message: parsed.data.kind === "expense" ? "Despesa lançada." : "Receita lançada.",
  };
}

export async function deleteFinanceEntryAction(id: string): Promise<ActionResult> {
  const business = await requireBusinessFor("finance.view");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  await supabase.from("finance_entries").delete().eq("id", id).eq("business_id", business.id);
  revalidatePath("/painel/financeiro");
  return { ok: true, message: "Lançamento removido." };
}
