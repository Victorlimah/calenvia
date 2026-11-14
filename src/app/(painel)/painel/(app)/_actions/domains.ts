"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { normalizeDomain, validateDomain } from "@/lib/domains/normalize";
import { addDomainToVercel, checkDns, removeDomainFromVercel } from "@/lib/domains/verify";
import { rootDomain } from "@/lib/hosts";
import { hasFeature } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/supabase/errors";

const NOT_PLAN = "Domínio próprio é um recurso do plano Pro+.";

/** Salva o domínio (um por negócio) e já tenta verificar. */
export async function saveDomainAction(raw: unknown): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  if (!hasFeature(business, "customDomain")) return { ok: false, error: NOT_PLAN };
  const parsed = z.object({ domain: z.string().max(260) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Informe o domínio." };
  const domain = normalizeDomain(parsed.data.domain);
  const invalid = validateDomain(domain, rootDomain());
  if (invalid) return { ok: false, error: invalid, fieldErrors: { domain: invalid } };

  const db = createSupabaseAdminClient();
  const { data: current } = await db
    .from("custom_domains")
    .select("domain")
    .eq("business_id", business.id)
    .maybeSingle();
  if (current && current.domain !== domain) {
    await db.from("custom_domains").delete().eq("business_id", business.id);
    await removeDomainFromVercel(current.domain);
  }
  if (!current || current.domain !== domain) {
    const { error } = await db.from("custom_domains").insert({ business_id: business.id, domain });
    if (error) {
      return {
        ok: false,
        error: isPgError(error, PG_UNIQUE_VIOLATION)
          ? "Esse domínio já está em uso por outro negócio."
          : "Não foi possível salvar o domínio.",
      };
    }
  }
  return verifyDomainAction();
}

/** Confere o DNS (e cadastra na Vercel) e marca como verificado. */
export async function verifyDomainAction(): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  if (!hasFeature(business, "customDomain")) return { ok: false, error: NOT_PLAN };
  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from("custom_domains")
    .select("domain")
    .eq("business_id", business.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Cadastre um domínio primeiro." };

  const vercel = await addDomainToVercel(row.domain);
  const dns = await checkDns(row.domain);
  const error = vercel && !vercel.ok ? vercel.error : dns.ok ? null : dns.error;
  await db
    .from("custom_domains")
    .update({
      last_checked_at: new Date().toISOString(),
      last_error: error,
      verified_at: error ? null : new Date().toISOString(),
    })
    .eq("business_id", business.id);
  revalidatePath("/painel", "layout");
  return error
    ? { ok: false, error }
    : { ok: true, message: `Pronto! ${row.domain} já abre a sua página.` };
}

export async function removeDomainAction(): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from("custom_domains")
    .delete()
    .eq("business_id", business.id)
    .select("domain")
    .maybeSingle();
  if (row) await removeDomainFromVercel(row.domain);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Domínio removido." };
}
