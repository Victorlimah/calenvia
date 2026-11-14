"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalid, type ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { todayIn } from "@/lib/dates";
import { parsePriceToCents } from "@/lib/money";
import { expiresAt, PACKAGE_ERRORS } from "@/lib/packages";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

const packageInput = z.object({
  serviceId: uuid,
  name: z.string().trim().min(2, "Dê um nome ao pacote.").max(60),
  sessions: z.coerce.number().int().min(2, "Mínimo de 2 sessões.").max(50),
  price: z.string().trim().min(1, "Informe o preço."),
  validityDays: z.coerce.number().int().min(0).max(730),
});

export async function createPackageAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("finance.view");
  const parsed = packageInput.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const price = parsePriceToCents(parsed.data.price);
  if (!price)
    return { ok: false, error: "Preço inválido.", fieldErrors: { price: "Preço inválido." } };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("service_packages").insert({
    business_id: business.id,
    service_id: parsed.data.serviceId,
    name: parsed.data.name,
    sessions: parsed.data.sessions,
    price_cents: price,
    validity_days: parsed.data.validityDays || null,
  });
  if (error) return { ok: false, error: "Não foi possível criar o pacote." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pacote criado." };
}

export async function togglePackageAction(id: string, active: boolean): Promise<ActionResult> {
  const business = await requireBusinessFor("finance.view");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("service_packages")
    .update({ is_active: active })
    .eq("id", id)
    .eq("business_id", business.id);
  revalidatePath("/painel", "layout");
  return { ok: true, message: active ? "Pacote reativado." : "Pacote desativado." };
}

/** Vende um pacote ao cliente e lança a receita no Financeiro. */
export async function sellPackageAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("finance.view");
  const parsed = z.object({ customerId: uuid, packageId: uuid }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Escolha o pacote." };
  const supabase = await createSupabaseServerClient();
  const { data: pkg } = await supabase
    .from("service_packages")
    .select("id, service_id, name, sessions, price_cents, validity_days, is_active")
    .eq("id", parsed.data.packageId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!pkg || !pkg.is_active) return { ok: false, error: "Pacote indisponível." };
  const now = new Date();
  const { error } = await supabase.from("customer_packages").insert({
    business_id: business.id,
    customer_id: parsed.data.customerId,
    package_id: pkg.id,
    service_id: pkg.service_id,
    name: pkg.name,
    sessions_total: pkg.sessions,
    price_cents: pkg.price_cents,
    sold_at: now.toISOString(),
    expires_at: expiresAt(now, pkg.validity_days),
  });
  if (error) return { ok: false, error: "Não foi possível vender o pacote." };
  await supabase.from("finance_entries").insert({
    business_id: business.id,
    kind: "income",
    amount_cents: pkg.price_cents,
    category: "Venda de pacote",
    description: pkg.name,
    occurred_on: todayIn(business.timezone),
  });
  revalidatePath("/painel", "layout");
  return { ok: true, message: `Pacote “${pkg.name}” vendido.` };
}

/** Desconta uma sessão do pacote neste agendamento. */
export async function consumePackageSessionAction(raw: unknown): Promise<ActionResult> {
  await requireBusinessFor("finance.view");
  const parsed = z.object({ customerPackageId: uuid, appointmentId: uuid }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("use_package_session", {
    p_customer_package_id: parsed.data.customerPackageId,
    p_appointment_id: parsed.data.appointmentId,
  });
  if (error) {
    const key = isPgError(error, PG_UNIQUE_VIOLATION) ? "duplicate" : error.message;
    return { ok: false, error: PACKAGE_ERRORS[key] ?? "Não foi possível descontar do pacote." };
  }
  revalidatePath("/painel", "layout");
  return {
    ok: true,
    message:
      data === 0 ? "Sessão descontada. O pacote acabou." : `Sessão descontada. Restam ${data}.`,
  };
}
