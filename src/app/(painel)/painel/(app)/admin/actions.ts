"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, invalid } from "@/lib/action-result";
import { getPlatformAdmin } from "@/lib/admin/auth";
import {
  adminBusinessSchema,
  type AdminBusinessInput,
  diffChanges,
} from "@/lib/admin/business-update";
import { supportUpdateSchema, type SupportUpdateInput } from "@/lib/admin/support";
import { reportError } from "@/lib/monitoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOT_ADMIN = "Você não tem acesso à administração.";
const UUID = /^[0-9a-f-]{36}$/i;

/** Muda plano, status e limites de um negócio e grava o que mudou no histórico (CAL-114). */
export async function updateBusinessAdminAction(
  businessId: string,
  input: Record<keyof AdminBusinessInput, unknown>,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  const parsed = adminBusinessSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { notes, ...fields } = parsed.data;

  const db = createSupabaseAdminClient();
  const [{ data: before }, { data: noteRow }] = await Promise.all([
    db
      .from("businesses")
      .select(
        "plan, plan_status, member_limit_override, message_limit_override, addon_messages, addon_members",
      )
      .eq("id", businessId)
      .maybeSingle(),
    db.from("admin_business_notes").select("notes").eq("business_id", businessId).maybeSingle(),
  ]);
  if (!before) return { ok: false, error: "Negócio não encontrado." };

  const changes = diffChanges({ ...before, notes: noteRow?.notes ?? "" }, { ...fields, notes });
  if (Object.keys(changes).length === 0) return { ok: true, message: "Nada mudou." };

  const fieldChanged = Object.keys(changes).some((k) => k !== "notes");
  if (fieldChanged) {
    const { error } = await db.from("businesses").update(fields).eq("id", businessId);
    if (error) {
      await reportError(error, {
        source: "action",
        path: "admin.updateBusiness",
        extra: { businessId },
      });
      return { ok: false, error: "Não foi possível salvar. Tente de novo." };
    }
  }
  if ("notes" in changes) {
    const { error } = await db.from("admin_business_notes").upsert({
      business_id: businessId,
      notes,
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    });
    if (error) {
      await reportError(error, {
        source: "action",
        path: "admin.updateNotes",
        extra: { businessId },
      });
      return { ok: false, error: "Não foi possível salvar a observação. Tente de novo." };
    }
  }

  const { error: auditError } = await db.from("admin_audit_log").insert({
    admin_user_id: admin.userId,
    admin_email: admin.email,
    business_id: businessId,
    action: "business.update",
    changes: JSON.parse(JSON.stringify(changes)),
  });
  if (auditError)
    await reportError(auditError, { source: "action", path: "admin.audit", extra: { businessId } });

  revalidatePath(`/admin/negocios/${businessId}`);
  return { ok: true, message: "Alterações salvas." };
}

/** Responde/muda o status de um pedido de suporte e grava no histórico do negócio (CAL-114). */
export async function updateSupportRequestAction(
  requestId: string,
  input: Record<keyof SupportUpdateInput, unknown>,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(requestId)) return { ok: false, error: "Pedido não encontrado." };
  const parsed = supportUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const db = createSupabaseAdminClient();
  const { data: before } = await db
    .from("support_requests")
    .select("business_id, status, admin_reply, answered_at")
    .eq("id", requestId)
    .maybeSingle();
  if (!before) return { ok: false, error: "Pedido não encontrado." };

  const changes = diffChanges(
    { status: before.status, admin_reply: before.admin_reply },
    { status: parsed.data.status, admin_reply: parsed.data.admin_reply },
  );
  if (Object.keys(changes).length === 0) return { ok: true, message: "Nada mudou." };

  const now = new Date().toISOString();
  const replyChanged = "admin_reply" in changes && parsed.data.admin_reply !== null;
  const { error } = await db
    .from("support_requests")
    .update({
      ...parsed.data,
      updated_at: now,
      answered_at: replyChanged ? now : before.answered_at,
    })
    .eq("id", requestId);
  if (error) {
    await reportError(error, {
      source: "action",
      path: "admin.updateSupport",
      extra: { requestId },
    });
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }

  const { error: auditError } = await db.from("admin_audit_log").insert({
    admin_user_id: admin.userId,
    admin_email: admin.email,
    business_id: before.business_id,
    action: "support.update",
    changes: JSON.parse(JSON.stringify(changes)),
  });
  if (auditError)
    await reportError(auditError, {
      source: "action",
      path: "admin.audit",
      extra: { requestId },
    });

  // Sem revalidatePath: as telas da administração são dinâmicas, e revalidar aqui recarregaria a
  // lista na hora, tirando o pedido (e a confirmação) da tela quando ele sai de "Abertos".
  return { ok: true, message: "Pedido atualizado. Ele sai desta lista quando você recarregar." };
}

/**
 * Suspender ou reativar um negócio na hora (CAL-131): suspenso = painel só leitura e página
 * de agendamento fechada. Vai para o histórico.
 */
export async function setBusinessSuspendedAction(
  businessId: string,
  suspend: boolean,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(businessId)) return { ok: false, error: "Pedido inválido." };
  const db = createSupabaseAdminClient();
  const { data: before } = await db
    .from("businesses")
    .select("plan_status")
    .eq("id", businessId)
    .maybeSingle();
  if (!before) return { ok: false, error: "Negócio não encontrado." };
  const to = suspend ? "suspended" : "active";
  if (before.plan_status === to) return { ok: true, message: "Nada mudou." };
  const { error } = await db.from("businesses").update({ plan_status: to }).eq("id", businessId);
  if (error) return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  await db.from("admin_audit_log").insert({
    admin_user_id: admin.userId,
    admin_email: admin.email,
    business_id: businessId,
    action: "business.update",
    changes: { plan_status: { from: before.plan_status, to } },
  });
  revalidatePath(`/admin/negocios/${businessId}`);
  return { ok: true, message: suspend ? "Negócio suspenso." : "Negócio reativado." };
}
