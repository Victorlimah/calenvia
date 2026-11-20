"use server";

import { revalidatePath } from "next/cache";
import { invalid, type ActionResult } from "@/lib/action-result";
import { getPlatformAdmin } from "@/lib/admin/auth";
import {
  canCancelOwnerInvitation,
  ownerInvitationStatus,
  ownerInviteEditSchema,
  ownerInviteSchema,
} from "@/lib/admin/owner-invitations";
import {
  auditInvite,
  createOwnerInvitation,
  regenerateOwnerInvitation,
  type InviteLink,
} from "@/lib/admin/owner-invitations-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOT_ADMIN = "Você não tem acesso à administração.";
const UUID = /^[0-9a-f-]{36}$/i;

/** "Convidar negócio": pré-cadastra o negócio e devolve o link (só nesta resposta). */
export async function createOwnerInviteAction(input: unknown): Promise<ActionResult<InviteLink>> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  const parsed = ownerInviteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  // Um e-mail com convite em aberto não ganha outro negócio por engano.
  const { data: open } = await createSupabaseAdminClient()
    .from("owner_invitations")
    .select("id")
    .eq("email", parsed.data.email)
    .is("accepted_at", null)
    .is("canceled_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (open?.length) {
    const msg = "Já existe um convite em aberto para esse e-mail. Gere um novo link na lista.";
    return { ok: false, error: msg, fieldErrors: { email: msg } };
  }

  const r = await createOwnerInvitation(admin, parsed.data);
  if (!r.ok) return r;
  revalidatePath("/admin/convites");
  revalidatePath("/admin");
  return { ok: true, data: r.data, message: "Convite criado." };
}

export async function regenerateOwnerInviteAction(
  invitationId: string,
): Promise<ActionResult<InviteLink>> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(invitationId)) return { ok: false, error: "Pedido inválido." };
  const r = await regenerateOwnerInvitation(admin, invitationId);
  if (!r.ok) return r;
  revalidatePath("/admin/convites");
  return { ok: true, data: r.data, message: "Novo link gerado. O anterior não funciona mais." };
}

export async function cancelOwnerInviteAction(invitationId: string): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(invitationId)) return { ok: false, error: "Pedido inválido." };
  const db = createSupabaseAdminClient();
  const { data: inv } = await db
    .from("owner_invitations")
    .select("id, business_id, email, expires_at, opened_at, accepted_at, canceled_at")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Convite não encontrado." };
  if (!canCancelOwnerInvitation(ownerInvitationStatus(inv))) {
    return { ok: false, error: "Este convite não pode mais ser cancelado." };
  }
  const { error } = await db
    .from("owner_invitations")
    .update({ canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("accepted_at", null);
  if (error) return { ok: false, error: "Não foi possível cancelar. Tente de novo." };
  await auditInvite(admin, inv.business_id, "invite.cancel", `Cancelou o convite de ${inv.email}`);
  revalidatePath("/admin/convites");
  return { ok: true, message: "Convite cancelado. O link não funciona mais." };
}

/** Editar os dados pré-cadastrados (nome do negócio, dono, e-mail, WhatsApp) antes do aceite. */
export async function editOwnerInviteAction(
  invitationId: string,
  input: unknown,
): Promise<ActionResult> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: NOT_ADMIN };
  if (!UUID.test(invitationId)) return { ok: false, error: "Pedido inválido." };
  const parsed = ownerInviteEditSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const db = createSupabaseAdminClient();
  const { data: inv } = await db
    .from("owner_invitations")
    .select("id, business_id, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Convite não encontrado." };
  if (inv.accepted_at) return { ok: false, error: "Convite já aceito: edite pelo negócio." };
  const v = parsed.data;
  const now = new Date().toISOString();
  const [a, b] = await Promise.all([
    db
      .from("owner_invitations")
      .update({ owner_name: v.ownerName, email: v.email, whatsapp: v.whatsapp, updated_at: now })
      .eq("id", inv.id),
    db
      .from("businesses")
      .update({ name: v.businessName, whatsapp: v.whatsapp })
      .eq("id", inv.business_id),
  ]);
  if (a.error || b.error) return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  await auditInvite(admin, inv.business_id, "invite.edit", `Editou o convite (${v.email})`);
  revalidatePath("/admin/convites");
  return { ok: true, message: "Dados do convite salvos." };
}
