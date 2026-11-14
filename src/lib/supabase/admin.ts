import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabaseUrl } from "./env";

/**
 * Client com a chave service_role: ignora RLS.
 * Use SOMENTE no servidor (rotas públicas validadas, cron, webhooks).
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
