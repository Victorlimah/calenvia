import "server-only";
import { randomBytes } from "node:crypto";
import type { PlatformAdmin } from "@/lib/admin/auth";
import { activateCourtesy } from "@/lib/billing/catalog";
import { starterServicesFor } from "@/lib/business/starter-services";
import { checkSlugAvailability } from "@/lib/business/slug-availability";
import { appUrl } from "@/lib/hosts";
import { reportError } from "@/lib/monitoring";
import { waMeLink } from "@/lib/phone";
import { slugify, validateSlug } from "@/lib/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashInviteToken, newInviteToken } from "@/lib/team/invitations";
import {
  OWNER_INVITE_TTL_DAYS,
  ownerInvitationMessage,
  type InviteLink,
  type OwnerInviteData,
} from "./owner-invitations";

const DAY_MS = 24 * 60 * 60 * 1000;

export type { InviteLink };

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function expiresAt(now = new Date()): string {
  return new Date(now.getTime() + OWNER_INVITE_TTL_DAYS * DAY_MS).toISOString();
}

/** Endereço livre para o negócio: o nome em slug, uma sugestão ou o nome com um sufixo curto. */
async function pickSlug(name: string): Promise<string> {
  let base = slugify(name);
  if (validateSlug(base)) base = slugify(`${base || "negocio"}-agenda`);
  const check = await checkSlugAvailability(base);
  if (check.available) return check.slug;
  if (check.suggestions[0]) return check.suggestions[0];
  return slugify(`${base.slice(0, 30)}-${randomBytes(3).toString("hex")}`);
}

export function buildInviteLink(
  token: string,
  data: { invitationId: string; businessId: string; ownerName: string; businessName: string },
  contact: { email: string; whatsapp: string | null },
): InviteLink {
  const link = appUrl(`/convite/${token}`);
  const message = ownerInvitationMessage(data.ownerName, data.businessName, link);
  return {
    invitationId: data.invitationId,
    businessId: data.businessId,
    link,
    message,
    whatsappLink: contact.whatsapp ? waMeLink(contact.whatsapp, message) : null,
    mailtoLink: `mailto:${contact.email}?subject=${encodeURIComponent(
      `Seu acesso à Calenvia — ${data.businessName}`,
    )}&body=${encodeURIComponent(message.replace(/\*/g, ""))}`,
  };
}

export async function auditInvite(
  admin: PlatformAdmin,
  businessId: string,
  action: "invite.create" | "invite.regenerate" | "invite.cancel" | "invite.edit",
  detail: string,
) {
  const { error } = await createSupabaseAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_user_id: admin.userId,
      admin_email: admin.email,
      business_id: businessId,
      action,
      changes: { detail: { from: null, to: detail } },
    });
  if (error) await reportError(error, { source: "action", path: "admin.audit", extra: { action } });
}

/**
 * Pré-cadastra o negócio (ativo, assinatura manual, sem dono) e cria o convite.
 * O token só existe na resposta: o banco guarda o hash.
 */
export async function createOwnerInvitation(
  admin: PlatformAdmin,
  input: OwnerInviteData,
): Promise<Result<InviteLink>> {
  const db = createSupabaseAdminClient();
  const slug = await pickSlug(input.businessName);
  const { data: business, error: bizError } = await db
    .from("businesses")
    .insert({
      owner_id: null,
      slug,
      name: input.businessName,
      segment: input.segment,
      whatsapp: input.whatsapp,
      plan: input.plan,
      plan_status: "pending",
      message_limit_override: input.messageLimitOverride,
      member_limit_override: input.memberLimitOverride,
    })
    .select("id")
    .single();
  if (bizError || !business) {
    await reportError(bizError, { source: "action", path: "admin.invite.business" });
    return { ok: false, error: "Não foi possível criar o negócio. Tente de novo." };
  }

  if (input.starterServices) {
    const services = starterServicesFor(input.segment).map((s, i) => ({
      business_id: business.id,
      name: s.name,
      duration_min: s.duration_min,
      sort_order: i,
    }));
    if (services.length) await db.from("services").insert(services);
  }

  // Negócio convidado nasce ativo com assinatura manual (cortesia), sem cobrança.
  const courtesy = await activateCourtesy(business.id, db);
  if (!courtesy.ok) {
    await db.from("businesses").delete().eq("id", business.id);
    return { ok: false, error: courtesy.error };
  }

  const token = newInviteToken();
  const { data: inv, error: invError } = await db
    .from("owner_invitations")
    .insert({
      business_id: business.id,
      email: input.email,
      owner_name: input.ownerName,
      whatsapp: input.whatsapp,
      token_hash: hashInviteToken(token),
      expires_at: expiresAt(),
      created_by: admin.userId,
    })
    .select("id")
    .single();
  if (invError || !inv) {
    await reportError(invError, { source: "action", path: "admin.invite.create" });
    await db.from("businesses").delete().eq("id", business.id);
    return { ok: false, error: "Não foi possível criar o convite. Tente de novo." };
  }
  await auditInvite(admin, business.id, "invite.create", `Convidou ${input.email} como dono`);
  return {
    ok: true,
    data: buildInviteLink(
      token,
      {
        invitationId: inv.id,
        businessId: business.id,
        ownerName: input.ownerName,
        businessName: input.businessName,
      },
      { email: input.email, whatsapp: input.whatsapp },
    ),
  };
}

/**
 * Gera um novo link (o anterior para de funcionar). Convite cancelado volta a valer com um
 * convite novo; aceito não pode.
 */
export async function regenerateOwnerInvitation(
  admin: PlatformAdmin,
  invitationId: string,
): Promise<Result<InviteLink>> {
  const db = createSupabaseAdminClient();
  const { data: inv } = await db
    .from("owner_invitations")
    .select(
      "id, business_id, email, owner_name, whatsapp, accepted_at, canceled_at, businesses(name)",
    )
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "Convite não encontrado." };
  if (inv.accepted_at) return { ok: false, error: "Este convite já foi aceito." };

  const token = newInviteToken();
  let id = inv.id;
  if (inv.canceled_at) {
    const { data: created, error } = await db
      .from("owner_invitations")
      .insert({
        business_id: inv.business_id,
        email: inv.email,
        owner_name: inv.owner_name,
        whatsapp: inv.whatsapp,
        token_hash: hashInviteToken(token),
        expires_at: expiresAt(),
        created_by: admin.userId,
      })
      .select("id")
      .single();
    if (error || !created) {
      return { ok: false, error: "Já existe outro convite em aberto para este negócio." };
    }
    id = created.id;
  } else {
    const { error } = await db
      .from("owner_invitations")
      .update({
        token_hash: hashInviteToken(token),
        expires_at: expiresAt(),
        opened_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inv.id)
      .is("accepted_at", null);
    if (error) return { ok: false, error: "Não foi possível gerar o link. Tente de novo." };
  }
  await auditInvite(
    admin,
    inv.business_id,
    "invite.regenerate",
    `Gerou novo link para ${inv.email}`,
  );
  const businessName = inv.businesses?.name ?? "seu negócio";
  return {
    ok: true,
    data: buildInviteLink(
      token,
      { invitationId: id, businessId: inv.business_id, ownerName: inv.owner_name, businessName },
      { email: inv.email, whatsapp: inv.whatsapp },
    ),
  };
}
