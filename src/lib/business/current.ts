import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type Business = Tables<"businesses">;

/** Negócio do dono logado (um por conta no MVP), ou null. */
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data;
});

/** Negócio do dono ou manda para o onboarding. */
export async function requireBusiness(): Promise<Business> {
  const business = await getCurrentBusiness();
  if (!business) redirect("/onboarding");
  return business;
}

/** Negócio com onboarding concluído (painel principal). */
export async function requireReadyBusiness(): Promise<Business> {
  const business = await requireBusiness();
  if (!business.onboarding_completed_at) redirect("/onboarding");
  return business;
}
