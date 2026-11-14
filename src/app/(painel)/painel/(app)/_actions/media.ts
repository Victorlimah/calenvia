"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireBusinessFor } from "@/lib/business/current";
import { MAX_GALLERY_PHOTOS, mediaPublicPrefix } from "@/lib/images";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "business-media";

function belongsToBusiness(url: string, businessId: string): boolean {
  return url.startsWith(mediaPublicPrefix(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", businessId));
}

function pathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

async function removeObject(url: string | null | undefined) {
  if (!url) return;
  const path = pathFromUrl(url);
  if (!path) return;
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function setBusinessImageAction(
  kind: "logo" | "cover",
  url: string | null,
): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  if (url && !belongsToBusiness(url, business.id)) return { ok: false, error: "Imagem inválida." };
  const column = kind === "logo" ? "logo_url" : "cover_url";
  const previous = business[column];
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("businesses")
    .update(kind === "logo" ? { logo_url: url } : { cover_url: url })
    .eq("id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar a imagem." };
  if (previous && previous !== url) await removeObject(previous);
  revalidatePath("/painel", "layout");
  return { ok: true, message: url ? "Imagem salva." : "Imagem removida." };
}

export async function setStaffPhotoAction(
  staffId: string,
  url: string | null,
): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  if (url && !belongsToBusiness(url, business.id)) return { ok: false, error: "Imagem inválida." };
  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from("staff_members")
    .select("photo_url")
    .eq("id", staffId)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!staff) return { ok: false, error: "Profissional não encontrado." };
  const { error } = await supabase
    .from("staff_members")
    .update({ photo_url: url })
    .eq("id", staffId)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: "Não foi possível salvar a foto." };
  if (staff.photo_url && staff.photo_url !== url) await removeObject(staff.photo_url);
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function addGalleryPhotoAction(url: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  if (!belongsToBusiness(url, business.id)) return { ok: false, error: "Imagem inválida." };
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("business_photos")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if ((count ?? 0) >= MAX_GALLERY_PHOTOS) {
    await removeObject(url);
    return {
      ok: false,
      error: `Limite de ${MAX_GALLERY_PHOTOS} fotos. Remova uma para adicionar.`,
    };
  }
  const { error } = await supabase.from("business_photos").insert({
    business_id: business.id,
    url,
    storage_path: pathFromUrl(url),
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { ok: false, error: "Não foi possível salvar a foto." };
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function removeGalleryPhotoAction(id: string): Promise<ActionResult> {
  const business = await requireBusinessFor("settings.manage");
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("business_photos")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id)
    .select("url")
    .maybeSingle();
  if (data?.url) await removeObject(data.url);
  revalidatePath("/painel", "layout");
  return { ok: true };
}
