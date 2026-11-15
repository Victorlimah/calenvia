"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, invalid } from "@/lib/action-result";
import { getPlatformAdmin } from "@/lib/admin/auth";
import {
  adminBusinessSchema,
  type AdminBusinessInput,
  diffChanges,
} from "@/lib/admin/business-update";
import { reportError } from "@/lib/monitoring";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOT_ADMIN = "Você não tem acesso à administração.";

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
      .select("plan, plan_status, member_limit_override, message_limit_override")
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
